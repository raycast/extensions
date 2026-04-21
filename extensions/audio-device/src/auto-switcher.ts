import { updateCommandMetadata } from "@raycast/api";
import {
  type IOType,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
  getAllVolumeInfo,
  setOutputDeviceVolume,
  setInputDeviceVolume,
} from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import {
  getDefaultDeviceUid,
  getDefaultDeviceName,
  getAllPinnedVolumes,
  getGraceUntil,
  migrateFromPriorityOrder,
} from "./device-preferences";

async function maybeSwitchToDefault(type: IOType): Promise<boolean> {
  const graceUntil = await getGraceUntil(type);
  if (Date.now() < graceUntil) return false;

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

async function enforcePinnedVolumes(type: IOType) {
  const pinnedMap = await getAllPinnedVolumes(type);
  if (pinnedMap.size === 0) return;

  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const allVolumes = await getAllVolumeInfo(type);
  const setVol = type === "input" ? setInputDeviceVolume : setOutputDeviceVolume;

  for (const device of devices) {
    const targetPct = pinnedMap.get(device.uid);
    if (targetPct == null) continue;

    try {
      const info = allVolumes[device.id] ?? allVolumes[device.uid];
      if (info?.volume == null) continue;
      const currentPct = Math.round(info.volume * 100);
      if (Math.abs(currentPct - targetPct) >= 2) {
        await setVol(device.id, targetPct / 100);
      }
    } catch (err) {
      console.error(`Failed to enforce volume for ${device.name} (${device.uid}):`, err);
    }
  }
}

async function runEnforcement(type: IOType) {
  await maybeSwitchToDefault(type);
  await enforcePinnedVolumes(type);
}

async function buildSubtitle(type: IOType): Promise<string> {
  const defaultName = await getDefaultDeviceName(type);
  const pinnedCount = (await getAllPinnedVolumes(type)).size;
  const details: string[] = [];
  if (defaultName) details.push(`Default: ${defaultName}`);
  if (pinnedCount > 0) details.push(`${pinnedCount} pinned`);
  return details.length > 0 ? details.join(" | ") : "No default device or pinned volumes";
}

export async function runAutoSwitch(type: IOType) {
  await migrateFromPriorityOrder(getInputDevices, getOutputDevices);
  await updateCommandMetadata({ subtitle: await buildSubtitle(type) });

  try {
    await runEnforcement(type);
  } catch {
    // Silently ignore errors in background
  }
}
