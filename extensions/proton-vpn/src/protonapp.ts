import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchCommand, LaunchType } from "@raycast/api";
import {
  clearTransition,
  getTransition,
  setTransition,
  Transition,
} from "./transition";
import {
  exportPrefsXml,
  getIdentity,
  getPreparedServer,
  PreparedServer,
  writeBool,
  writeDataJson,
  writeInt,
  writeString,
} from "./prefs";
import {
  getOnDemandEnabled,
  getService,
  getState,
  start,
  VpnState,
  waitForState,
} from "./vpn";

const exec = promisify(execFile);

const APP_BUNDLE_ID = "ch.protonvpn.mac";
const APP_PROCESS = "ProtonVPN";
const PROFILE_ID = "raycastswitch0000001"; // 20 characters, the length the app uses

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isAppRunning(): Promise<boolean> {
  try {
    await exec("/usr/bin/pgrep", ["-x", APP_PROCESS]);
    return true;
  } catch {
    return false;
  }
}

async function launchAppInBackground(): Promise<void> {
  await exec("/usr/bin/open", ["-g", "-b", APP_BUNDLE_ID]);
}

/** Bring the Proton VPN app to the front, wherever it is installed. */
export async function openProtonApp(): Promise<void> {
  await exec("/usr/bin/open", ["-b", APP_BUNDLE_ID]);
}

/**
 * Restart the user's preferences daemon so the app reads our external
 * `defaults write` changes instead of its stale in-memory domain cache.
 */
async function flushPrefsCache(): Promise<void> {
  try {
    await exec("/usr/bin/killall", ["cfprefsd"]);
  } catch {
    // cfprefsd not running; nothing to flush
  }
  await delay(300);
}

/**
 * Quit the app without its confirmation dialog.
 * While `LaunchedBefore` is false, the app disconnects the VPN, disables the
 * on-demand reconnect rule, and quits silently. The flag is restored right after.
 */
async function cleanQuitApp(): Promise<void> {
  await writeBool("LaunchedBefore", false);
  await flushPrefsCache();
  try {
    await exec("/usr/bin/osascript", [
      "-e",
      `tell application id "${APP_BUNDLE_ID}" to quit`,
    ]);
    for (let i = 0; i < 30 && (await isAppRunning()); i++) {
      await delay(500);
    }
  } finally {
    await writeBool("LaunchedBefore", true);
  }
  if (await isAppRunning()) {
    throw new Error("The Proton VPN app did not quit in time.");
  }
}

interface RaycastProfile {
  id: string;
  accessTier: number;
  profileIcon: { bolt: Record<string, never> };
  profileType: { user: Record<string, never> };
  serverType: { serverType: number };
  serverOffering: { fastest: { _0?: string } };
  name: string;
  connectionProtocol: { smartProtocol: boolean };
}

function buildProfile(
  countryCode: string | undefined,
  accessTier: number,
): RaycastProfile {
  return {
    id: PROFILE_ID,
    accessTier,
    profileIcon: { bolt: {} },
    profileType: { user: {} },
    serverType: { serverType: 0 },
    serverOffering: { fastest: countryCode ? { _0: countryCode } : {} },
    name: "Raycast Switch",
    connectionProtocol: { smartProtocol: true },
  };
}

export interface SwitchResult {
  server?: PreparedServer;
}

/** Re-render the menu bar command so it reflects the current transition. */
async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menubar", type: LaunchType.Background });
  } catch {
    // The menu bar command is disabled; nothing to refresh.
  }
}

/** Track a transition while `work` runs, and refresh the menu bar around it. */
async function withTransition<T>(
  transition: Omit<Transition, "startedAt">,
  work: () => Promise<T>,
): Promise<T> {
  await setTransition(transition);
  await refreshMenuBar();
  try {
    return await work();
  } finally {
    await clearTransition();
    await refreshMenuBar();
  }
}

export interface RichStatus {
  state: VpnState;
  onDemand: boolean;
  /** Last server the app prepared; the active one while connected. */
  server?: PreparedServer;
}

export async function getRichStatus(): Promise<RichStatus> {
  const service = await getService();
  const [state, onDemand, prefs] = await Promise.all([
    getState(service.id),
    getOnDemandEnabled(service.id),
    exportPrefsXml(),
  ]);
  return { state, onDemand, server: getPreparedServer(prefs) };
}

/**
 * Return the active transition, or clean it up when the real VPN state shows
 * it already finished. The command that started a transition can be
 * terminated early, so readers must not trust the stored flag blindly.
 */
export async function reconcileTransition(
  status: RichStatus,
): Promise<Transition | undefined> {
  const transition = await getTransition();
  if (!transition) return undefined;

  const done =
    transition.kind === "disconnect"
      ? status.state === "Disconnected"
      : status.state === "Connected" &&
        (!transition.countryCode ||
          status.server?.exitCountryCode === transition.countryCode);
  if (!done) return transition;

  // Finish the cleanup the terminated command could not do itself.
  await writeBool("AutoConnect", false);
  await clearTransition();
  return undefined;
}

/**
 * Connect to the fastest server in a country (or overall when no code is given).
 * The app resolves the server itself through its auto-connect path.
 */
export async function connectToCountry(
  countryCode?: string,
): Promise<SwitchResult> {
  return withTransition({ kind: "connect", countryCode }, () =>
    connectToCountryImpl(countryCode),
  );
}

async function connectToCountryImpl(
  countryCode?: string,
): Promise<SwitchResult> {
  const identity = await getIdentity();
  if (countryCode && identity.tier < 1) {
    throw new Error(
      "A paid Proton VPN plan is necessary for country selection.",
    );
  }

  const service = await getService();

  if (await isAppRunning()) {
    await cleanQuitApp();
  }
  await waitForState(service.id, ["Disconnected"], 15000);

  await writeInt("profileCacheVersion", 2);
  await writeDataJson(`profiles_${identity.userId}`, [
    buildProfile(countryCode, identity.tier),
  ]);
  await writeBool("AutoConnect", true);
  await writeString(`AutoConnect_${identity.username}`, PROFILE_ID);
  await flushPrefsCache();

  try {
    await launchAppInBackground();
    const state = await waitForState(service.id, ["Connected"], 60000);
    if (state !== "Connected") {
      throw new Error(
        "The connection did not come up. Open the Proton VPN app to check.",
      );
    }
  } finally {
    // The app only reads this flag at launch; restore it so normal app
    // launches by the user do not auto-connect.
    await writeBool("AutoConnect", false);
  }

  const prefs = await exportPrefsXml();
  return { server: getPreparedServer(prefs) };
}

/**
 * Disconnect, and defeat the on-demand reconnect rule when it is active.
 * With on-demand off, a plain scutil stop is sufficient. With on-demand on,
 * only the app can disable the rule, so the quit path is used.
 */
export async function smartDisconnect(): Promise<void> {
  return withTransition({ kind: "disconnect" }, smartDisconnectImpl);
}

async function smartDisconnectImpl(): Promise<void> {
  const service = await getService();
  if ((await getState(service.id)) === "Disconnected") {
    return;
  }

  const onDemand = await getOnDemandEnabled(service.id);
  if (!onDemand) {
    await exec("/usr/sbin/scutil", ["--nc", "stop", service.id]);
    const state = await waitForState(service.id, ["Disconnected"], 15000);
    if (state === "Disconnected") return;
  }

  // The app must be running and signed in for the quit path to disconnect.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!(await isAppRunning())) {
      await launchAppInBackground();
      await delay(attempt === 0 ? 8000 : 15000);
    }
    await cleanQuitApp();
    const state = await waitForState(service.id, ["Disconnected"], 20000);
    if (state === "Disconnected") return;
  }
  throw new Error("Could not disconnect. Open the Proton VPN app to check.");
}

/** Reconnect to the last used server without the app (fast path). */
export async function reconnectLastServer(): Promise<void> {
  return withTransition({ kind: "connect" }, reconnectLastServerImpl);
}

async function reconnectLastServerImpl(): Promise<void> {
  const service = await getService();
  await start(service.id);
  const state = await waitForState(
    service.id,
    ["Connected", "Disconnected"],
    30000,
  );
  if (state !== "Connected") {
    throw new Error(
      "The connection did not come up. Open the Proton VPN app to check.",
    );
  }
}
