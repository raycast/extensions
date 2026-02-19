import { LaunchType, environment, showHUD, updateCommandMetadata } from "@raycast/api";
import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
  getOutputDeviceVolume,
  setOutputDeviceVolume,
  getInputDeviceVolume,
  setInputDeviceVolume,
} from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import {
  applyDeviceOrder,
  getDeviceOrder,
  getHiddenDevices,
  getDefaultDeviceUid,
  getDefaultDeviceName,
  getAllPinnedVolumes,
} from "./device-preferences";

type IOType = "input" | "output";

async function maybeSwitchToDefault(type: IOType): Promise<boolean> {
  const defaultUid = await getDefaultDeviceUid(type);
  if (!defaultUid) return false;

  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const target = devices.find((d) => d.uid === defaultUid);
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

async function maybeSwitchByPriority(type: IOType) {
  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const order = await getDeviceOrder(type);
  const hiddenDevices = await getHiddenDevices(type);
  const hiddenSet = new Set(hiddenDevices);
  const ordered = applyDeviceOrder(order, devices).filter((d) => !hiddenSet.has(d.uid));
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

async function enforcePinnedVolumes(type: IOType) {
  const pinnedMap = await getAllPinnedVolumes(type);
  if (pinnedMap.size === 0) return;

  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const getVol = type === "input" ? getInputDeviceVolume : getOutputDeviceVolume;
  const setVol = type === "input" ? setInputDeviceVolume : setOutputDeviceVolume;

  for (const device of devices) {
    const targetPct = pinnedMap.get(device.uid);
    if (targetPct == null) continue;

    try {
      const currentVol = await getVol(device.id);
      if (currentVol == null) continue;
      const currentPct = Math.round(currentVol * 100);
      if (Math.abs(currentPct - targetPct) >= 2) {
        await setVol(device.id, targetPct / 100);
      }
    } catch {
      // Device may not support volume
    }
  }
}

async function runEnforcement(type: IOType) {
  const switchedToDefault = await maybeSwitchToDefault(type);
  if (!switchedToDefault) {
    await maybeSwitchByPriority(type);
  }
  await enforcePinnedVolumes(type);
}

async function buildSubtitle(type: IOType): Promise<string> {
  const defaultName = await getDefaultDeviceName(type);
  const pinnedCount = (await getAllPinnedVolumes(type)).size;
  const parts: string[] = [];
  if (defaultName) parts.push(`Default: ${defaultName}`);
  if (pinnedCount > 0) parts.push(`${pinnedCount} pinned`);
  return parts.length > 0 ? parts.join(" | ") : "Active";
}

export async function runAutoSwitch(type: IOType) {
  const isBackground = environment.launchType === LaunchType.Background;

  const subtitle = await buildSubtitle(type);
  await updateCommandMetadata({ subtitle });

  if (!isBackground) {
    await showHUD("Audio enforcer is always active");
    return;
  }

  try {
    await runEnforcement(type);
  } catch {
    // Silently ignore errors in background
  }
}

export { runEnforcement as applyAutoSwitchIfEnabled };
