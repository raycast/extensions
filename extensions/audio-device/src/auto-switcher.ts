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
import { applyDeviceOrder, getDeviceOrder, getHiddenDevices } from "./device-preferences";

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

async function maybeSwitchInput(hiddenDevices: string[]) {
  const devices = await getInputDevices();
  const order = await getDeviceOrder("input");
  const hiddenSet = new Set(hiddenDevices);
  const ordered = applyDeviceOrder(order, devices).filter((device) => !hiddenSet.has(device.uid));
  const target = ordered[0];
  if (!target) return false;

  const current = await getDefaultInputDevice();
  if (current.uid === target.uid) return false;

  await setDefaultInputDevice(target.id);
  return true;
}

async function maybeSwitchOutput(hiddenDevices: string[]) {
  const devices = await getOutputDevices();
  const order = await getDeviceOrder("output");
  const hiddenSet = new Set(hiddenDevices);
  const ordered = applyDeviceOrder(order, devices).filter((device) => !hiddenSet.has(device.uid));
  const target = ordered[0];
  if (!target) return false;

  const current = await getDefaultOutputDevice();
  if (current.uid === target.uid) return false;

  await setOutputAndSystemDevice(target.id);
  return true;
}

async function runSwitch(type: IOType) {
  const hiddenDevices = await getHiddenDevices(type);
  const changed = type === "input" ? await maybeSwitchInput(hiddenDevices) : await maybeSwitchOutput(hiddenDevices);

  return changed;
}

export async function applyAutoSwitchIfEnabled(type: IOType) {
  const enabled = await isAutoSwitchEnabled(type);
  if (!enabled) return false;

  try {
    return await runSwitch(type);
  } catch {
    return false;
  }
}

export async function runAutoSwitch(type: IOType) {
  const isBackground = environment.launchType === LaunchType.Background;
  const enabled = await isAutoSwitchEnabled(type);

  if (!isBackground) {
    const nextEnabled = !enabled;
    await setAutoSwitchEnabled(type, nextEnabled);
    await updateCommandMetadata({ subtitle: nextEnabled ? "Enabled" : "Disabled" });
    await showHUD(nextEnabled ? "Auto switch enabled" : "Auto switch disabled");
    if (!nextEnabled) return;
  } else if (!enabled) {
    await updateCommandMetadata({ subtitle: "Disabled" });
    return;
  } else {
    await updateCommandMetadata({ subtitle: "Enabled" });
  }

  try {
    if (isBackground && (await shouldSkipForInterval(type))) {
      return;
    }
    await runSwitch(type);
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
