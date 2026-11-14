import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createClient } from "./preferences";
import { checkRokuCancellation, describeRokuError, RokuClient, RokuError, wakeDevice } from "./roku";
import { getSelectedDevice } from "./storage";
import type { RokuApp, RokuDevice } from "./types";
import { createActivityController } from "./activity";
import { clearPreviousActivity, getPreviousActivity, rememberActivity } from "./activity-store";

const CONTROL_HELP =
  "On the TV, open Settings → System → Advanced system settings → Control by mobile apps and choose Enabled.";

const VERIFIED_TTL_MS = 120_000;
const verified = new Map<string, { host: string; at: number }>();

/** Forget a cached identity check, e.g. after a network failure. */
export function forgetVerification(device: RokuDevice): void {
  verified.delete(device.id);
}

/**
 * Validate the identity before using a cached address: DHCP can reassign it.
 * A successful check is reused for two minutes so rapid remote presses cost a
 * single HTTP request instead of two.
 */
export async function verifiedClient(device: RokuDevice, options: { force?: boolean } = {}): Promise<RokuClient> {
  const client = createClient(device);
  const cached = verified.get(device.id);
  if (!options.force && cached && cached.host === device.host && Date.now() - cached.at < VERIFIED_TTL_MS) {
    return client;
  }
  const live = await client.getDeviceInfo();
  if (live.id !== device.id) {
    verified.delete(device.id);
    throw new Error("This address now belongs to a different Roku. Open Manage Roku TVs and scan again.");
  }
  if (["limited", "disabled", "disable"].includes(live.controlMode?.toLowerCase() || "")) {
    verified.delete(device.id);
    throw new Error(`${device.name} has restricted network control. ${CONTROL_HELP}`);
  }
  verified.set(device.id, { host: device.host, at: Date.now() });
  return client;
}

/** Run a client call, dropping the cached identity if the TV stops answering. */
async function withClient<T>(device: RokuDevice, work: (client: RokuClient) => Promise<T>): Promise<T> {
  const client = await verifiedClient(device);
  try {
    return await work(client);
  } catch (error) {
    if (error instanceof RokuError && error.code !== "cancelled") forgetVerification(device);
    throw error;
  }
}

const actions = new Map<string, Promise<unknown>>();

/** Include identity checks in ordering, so a faster second query cannot overtake a key. */
function inOrder<T>(device: RokuDevice, action: () => Promise<T>): Promise<T> {
  const work = (actions.get(device.id) ?? Promise.resolve()).catch(() => undefined).then(action);
  actions.set(device.id, work);
  const cleanup = () => {
    if (actions.get(device.id) === work) actions.delete(device.id);
  };
  void work.then(cleanup, cleanup);
  return work;
}

function waitWithCancellation(milliseconds: number, signal?: AbortSignal): Promise<void> {
  checkRokuCancellation(signal);
  return new Promise((resolve, reject) => {
    const cancelled = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancelled);
      reject(new RokuError("The Roku action was cancelled.", "cancelled"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancelled);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", cancelled, { once: true });
    if (signal?.aborted) cancelled();
  });
}

function activityClient(device: RokuDevice, client: RokuClient, signal?: AbortSignal) {
  return createActivityController({
    active: () => {
      checkRokuCancellation(signal);
      return client.getActiveApp();
    },
    launch: (id) => client.launchApp(id, { signal }),
    home: () => client.pressKey("Home", { signal }),
    previous: () => getPreviousActivity(device.id),
    remember: (app) => rememberActivity(device.id, app),
    clearPrevious: () => clearPreviousActivity(device.id),
    wait: (milliseconds) => waitWithCancellation(milliseconds, signal),
  });
}

export function launchOnDevice(
  device: RokuDevice,
  appId: string,
  options: { remember?: boolean; name?: string; signal?: AbortSignal } = {},
) {
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    const client = await verifiedClient(device);
    checkRokuCancellation(options.signal);
    return activityClient(device, client, options.signal).launch(appId, options.name, options.remember !== false);
  });
}

export function restoreActivity(device: RokuDevice, options: { signal?: AbortSignal } = {}) {
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    const client = await verifiedClient(device);
    checkRokuCancellation(options.signal);
    return activityClient(device, client, options.signal).restore();
  });
}

export function restoreKnownActivity(device: RokuDevice, app: RokuApp, options: { signal?: AbortSignal } = {}) {
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    const client = await verifiedClient(device);
    checkRokuCancellation(options.signal);
    return activityClient(device, client, options.signal).restoreKnown(app);
  });
}

export function homeOnDevice(device: RokuDevice, options: { remember?: boolean; signal?: AbortSignal } = {}) {
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    const client = await verifiedClient(device);
    checkRokuCancellation(options.signal);
    return activityClient(device, client, options.signal).home(options.remember !== false);
  });
}

export function sendKey(
  device: RokuDevice,
  key: string,
  options: { remember?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  if (key === "Home") return homeOnDevice(device, options).then(() => undefined);
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    if (key.startsWith("Volume") && device.capabilities.volume === false) {
      throw new Error("This Roku reports that TV volume control is unavailable. Check its HDMI-CEC settings.");
    }
    if (key.startsWith("Power") && device.capabilities.power === false) {
      throw new Error("This Roku reports that TV power control is unavailable. Check its HDMI-CEC settings.");
    }
    await withClient(device, (client) => client.pressKey(key, { signal: options.signal }));
  });
}

/** Press a key several times in a row (e.g. volume steps). */
export function sendKeyRepeated(device: RokuDevice, key: string, times: number): Promise<void> {
  const count = Math.max(1, Math.min(50, Math.floor(times)));
  return inOrder(device, () =>
    withClient(device, async (client) => {
      for (let i = 0; i < count; i++) await client.pressKey(key);
    }),
  );
}

/** Type characters (Lit_ keys) and/or backspaces as one ordered batch. */
export function typeOnDevice(device: RokuDevice, edit: { backspaces?: number; text?: string; enter?: boolean }) {
  return inOrder(device, () =>
    withClient(device, async (client) => {
      for (let i = 0; i < (edit.backspaces ?? 0); i++) await client.pressKey("Backspace");
      if (edit.text) await client.sendText(edit.text);
      if (edit.enter) await client.pressKey("Enter");
    }),
  );
}

/** Open Roku universal search for a title, actor or show. */
export function searchOnDevice(device: RokuDevice, keyword: string, options: { launch?: boolean } = {}) {
  return inOrder(device, () => withClient(device, (client) => client.search(keyword, options)));
}

/** Wake is verified through device-info; sending a packet alone is not success. */
export function turnOn(device: RokuDevice, options: { signal?: AbortSignal } = {}): Promise<boolean> {
  return inOrder(device, async () => {
    checkRokuCancellation(options.signal);
    if (device.capabilities.power === false) throw new Error("This Roku does not report TV power control support.");
    let identityVerified = false;
    try {
      const client = await verifiedClient(device);
      checkRokuCancellation(options.signal);
      identityVerified = true;
      await client.pressKey("PowerOn", { signal: options.signal });
    } catch (error) {
      checkRokuCancellation(options.signal);
      // Some TVs answer read queries in standby but reject PowerOn until a wake packet arrives.
      const asleep =
        error instanceof RokuError &&
        (["network", "timeout"].includes(error.code) || (identityVerified && error.status === 403));
      if (!asleep) throw error;
      await wakeDevice(device, { signal: options.signal });
    }
    const client = new RokuClient(device.host, { timeoutMs: 1200 });
    for (let attempt = 0; attempt < 5; attempt++) {
      await waitWithCancellation(700, options.signal);
      try {
        const info = await client.getDeviceInfo();
        checkRokuCancellation(options.signal);
        if (info.id !== device.id) throw new Error("This address now belongs to another Roku. Scan for TVs again.");
        // A streaming player's power mode cannot confirm that its separate HDMI TV is on.
        if (info.isTv && info.powerMode === "PowerOn") return true;
      } catch (error) {
        if (!(error instanceof RokuError) || error.code === "cancelled") throw error;
      }
    }
    return false;
  });
}

export async function runQuickKey(key: string, label: string): Promise<void> {
  try {
    const device = await getSelectedDevice();
    if (!device) {
      await launchCommand({ name: "manage-devices", type: LaunchType.UserInitiated });
      await showFailureToast("Select a default TV in Manage Roku TVs.", { title: "Choose a Roku first" });
      return;
    }
    if (key === "PowerOn") {
      const confirmed = await turnOn(device);
      await showHUD(confirmed ? `${device.name} is on` : `Wake request sent to ${device.name}; not yet confirmed`);
    } else {
      await sendKey(device, key);
      await showHUD(`${label} sent to ${device.name}`);
    }
  } catch (error) {
    await showFailureToast(describeRokuError(error), { title: "Roku command failed" });
  }
}
