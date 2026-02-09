import { LaunchType, LocalStorage, environment, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
} from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import { AUTO_SWITCH_KEYS } from "./auto-switch-keys";
import {
  applyDeviceOrder,
  getDeviceOrder,
  getHiddenDevices,
  getDefaultDeviceUid,
  getDefaultDeviceName,
} from "./device-preferences";

type IOType = "input" | "output";

const AUTO_SWITCH_INTERVAL_SECONDS = 20;
const MS_PER_SECOND = 1000;

const AUTO_SWITCH_LAST_RUN_KEYS = {
  input: "autoSwitchLastRunInput",
  output: "autoSwitchLastRunOutput",
} as const;

async function shouldSkipForInterval(type: IOType) {
  const lastRunRaw = await LocalStorage.getItem<string>(AUTO_SWITCH_LAST_RUN_KEYS[type]);
  const lastRun = lastRunRaw ? Number(lastRunRaw) : undefined;
  if (!lastRun || !Number.isFinite(lastRun)) return false;
  const intervalMs = AUTO_SWITCH_INTERVAL_SECONDS * MS_PER_SECOND;
  return Date.now() - lastRun < intervalMs;
}

async function markLastRun(type: IOType) {
  await LocalStorage.setItem(AUTO_SWITCH_LAST_RUN_KEYS[type], String(Date.now()));
}

async function isAutoSwitchEnabled(type: IOType) {
  return (await LocalStorage.getItem(AUTO_SWITCH_KEYS[type])) === "true";
}

async function setAutoSwitchEnabled(type: IOType, enabled: boolean) {
  await LocalStorage.setItem(AUTO_SWITCH_KEYS[type], enabled ? "true" : "false");
}

/**
 * Try to switch to the user's default (sticky) device if it is available.
 * Returns true if a switch was made, false otherwise.
 */
async function maybeSwitchToDefault(type: IOType): Promise<boolean> {
  const defaultUid = await getDefaultDeviceUid(type);
  if (!defaultUid) return false;

  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const target = devices.find((d) => d.uid === defaultUid);
  if (!target) return false; // default device is not connected

  const current = type === "input" ? await getDefaultInputDevice() : await getDefaultOutputDevice();
  if (current.uid === target.uid) return false; // already on the default device

  if (type === "input") {
    await setDefaultInputDevice(target.id);
  } else {
    await setOutputAndSystemDevice(target.id);
  }
  return true;
}

async function maybeSwitchByPriority(type: IOType, hiddenDevices: string[]) {
  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const order = await getDeviceOrder(type);
  const hiddenSet = new Set(hiddenDevices);
  const ordered = applyDeviceOrder(order, devices).filter((device) => !hiddenSet.has(device.uid));
  const target = ordered[0];
  if (!target) return false;

  const current = type === "input" ? await getDefaultInputDevice() : await getDefaultOutputDevice();
  if (current.uid === target.uid) return false;

  if (type === "input") {
    await setDefaultInputDevice(target.id);
  } else {
    await setOutputAndSystemDevice(target.id);
  }
  return true;
}

async function runSwitch(type: IOType, includeAutoSwitch: boolean) {
  // Default device always takes priority
  const switchedToDefault = await maybeSwitchToDefault(type);
  if (switchedToDefault) return true;

  // Fall back to priority-order auto-switch only if enabled
  if (!includeAutoSwitch) return false;

  const hiddenDevices = await getHiddenDevices(type);
  return maybeSwitchByPriority(type, hiddenDevices);
}

export async function applyAutoSwitchIfEnabled(type: IOType) {
  const enabled = await isAutoSwitchEnabled(type);

  try {
    // Always try the default device; only do priority-order if auto-switch is enabled
    return await runSwitch(type, enabled);
  } catch {
    return false;
  }
}

async function buildSubtitle(type: IOType, autoSwitchEnabled: boolean): Promise<string> {
  const defaultName = await getDefaultDeviceName(type);
  const parts: string[] = [];
  if (autoSwitchEnabled) parts.push("Enabled");
  if (defaultName) parts.push(`Default: ${defaultName}`);
  if (parts.length === 0) return "Disabled";
  return parts.join(" | ");
}

export async function runAutoSwitch(type: IOType) {
  const isBackground = environment.launchType === LaunchType.Background;
  const enabled = await isAutoSwitchEnabled(type);
  const hasDefault = !!(await getDefaultDeviceUid(type));

  if (!isBackground) {
    // Manual trigger: toggle the auto-switch state
    const nextEnabled = !enabled;
    await setAutoSwitchEnabled(type, nextEnabled);
    const subtitle = await buildSubtitle(type, nextEnabled);
    await updateCommandMetadata({ subtitle });
    await showHUD(nextEnabled ? "Auto switch enabled" : "Auto switch disabled");
    if (!nextEnabled && !hasDefault) return;
  } else if (!enabled && !hasDefault) {
    // Background: nothing to do if both auto-switch and default are off
    await updateCommandMetadata({ subtitle: "Disabled" });
    return;
  } else {
    // Background: update subtitle to reflect current state
    const subtitle = await buildSubtitle(type, enabled);
    await updateCommandMetadata({ subtitle });
  }

  try {
    if (isBackground && (await shouldSkipForInterval(type))) {
      return;
    }
    await runSwitch(type, enabled);
    if (isBackground) {
      await markLastRun(type);
    }
  } catch (error) {
    if (!isBackground) {
      await showToast(
        Toast.Style.Failure,
        `Auto switch ${type === "input" ? "input" : "output"} failed`,
        String(error),
      );
    }
  }
}
