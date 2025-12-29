import {
  LaunchType,
  LocalStorage,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultSystemDevice,
} from "./audio-priority";
import { AUTO_SWITCH_KEYS } from "./auto-switch-keys";
import { applyDeviceOrder, getDeviceOrder, getDisabledDevices } from "./device-preferences";

type IOType = "input" | "output";

async function isAutoSwitchEnabled(type: IOType) {
  return (await LocalStorage.getItem(AUTO_SWITCH_KEYS[type])) === "true";
}

async function setAutoSwitchEnabled(type: IOType, enabled: boolean) {
  await LocalStorage.setItem(AUTO_SWITCH_KEYS[type], enabled ? "true" : "false");
}

async function setOutputAndSystemDevice(deviceId: string) {
  const { systemOutput } = getPreferenceValues();
  await setDefaultOutputDevice(deviceId);
  if (systemOutput) {
    await setDefaultSystemDevice(deviceId);
  }
}

async function maybeSwitchInput(disabledDevices: string[]) {
  const devices = await getInputDevices();
  const order = await getDeviceOrder("input");
  const disabledSet = new Set(disabledDevices);
  const ordered = applyDeviceOrder(order, devices).filter((device) => !disabledSet.has(device.uid));
  const target = ordered[0];
  if (!target) return false;

  const current = await getDefaultInputDevice();
  if (current.uid === target.uid) return false;

  await setDefaultInputDevice(target.id);
  return true;
}

async function maybeSwitchOutput(disabledDevices: string[]) {
  const devices = await getOutputDevices();
  const order = await getDeviceOrder("output");
  const disabledSet = new Set(disabledDevices);
  const ordered = applyDeviceOrder(order, devices).filter((device) => !disabledSet.has(device.uid));
  const target = ordered[0];
  if (!target) return false;

  const current = await getDefaultOutputDevice();
  if (current.uid === target.uid) return false;

  await setOutputAndSystemDevice(target.id);
  return true;
}

async function runSwitch(type: IOType) {
  const disabledDevices = await getDisabledDevices();
  const changed = type === "input" ? await maybeSwitchInput(disabledDevices) : await maybeSwitchOutput(disabledDevices);

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
    await runSwitch(type);
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
