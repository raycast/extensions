// Enable Auto Switch: one background run for both directions. Applies the priorities with decide() and keeps
// pinned volumes in place.
import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  type IOType,
  errorMessage,
  getAllVolumeInfo,
  getDefaultDevice,
  getDeviceState,
  getDevices,
  setDefaultDevice,
  setVolume,
} from "./audio-device";
import {
  getAllPinnedVolumes,
  getConnectOverrides,
  getDeviceMeta,
  getHiddenDevices,
  getPriorityList,
  getSnapshot,
  setPriorityList,
  setSnapshot,
} from "./device-preferences";
import { switchOnConnectUids } from "./priority/connect-mode";
import { decide, makeSnapshot, sameSnapshot } from "./priority/decide";
import { reconcile } from "./priority/list";
import { runIfFree } from "./switch-lock";
import { displayName } from "./priority/meta";

/**
 * The `interval` of the auto-switch command in package.json. Also the base for sleep detection (a gap of more than
 * 3 intervals): background runs drift on battery, and a drifting run must not look like a wake from sleep.
 */
const INTERVAL_MS = 60_000;

/** A pinned volume is restored when it drifts by this many percentage points or more. */
export const PINNED_VOLUME_TOLERANCE = 2;

/** Whether a pinned volume has drifted far enough to be restored (`volume` 0–1, `level` 0–100). */
export const pinnedVolumeDrifted = (volume: number, level: number) =>
  Math.abs(Math.round(volume * 100) - level) >= PINNED_VOLUME_TOLERANCE;

/**
 * One decide() run for a direction: switch if needed and store the snapshot. Also used by the open device list.
 * A direction without devices (a Mac mini has no microphone) has nothing to do.
 */
export async function applyPriorities(type: IOType) {
  // Serialized with manual switches and other runs (see switch-lock.ts). When another switch is in progress this run
  // is skipped: that one does the same work, and a manual choice must not be undone.
  await runIfFree(type, () => applyPrioritiesLocked(type));
}

async function applyPrioritiesLocked(type: IOType) {
  const [{ devices, current }, hidden, stored] = await Promise.all([
    getDeviceState(type),
    getHiddenDevices(type),
    getPriorityList(type),
  ]);
  if (!current) return;
  const refs = devices.map((d) => ({ uid: d.uid, name: d.name }));

  // Follow UID changes by name, and drop hidden devices: a hidden device cannot have a priority.
  const priorities = reconcile(stored, refs).filter((p) => !hidden.includes(p.uid));
  if (JSON.stringify(priorities) !== JSON.stringify(stored)) await setPriorityList(type, priorities);

  const now = { devices: refs, currentUid: current.uid, ts: Date.now() };
  const prev = await getSnapshot(type);
  const { target } = decide({
    prev,
    now,
    priorities,
    hidden,
    intervalMs: INTERVAL_MS,
    switchOnConnect: switchOnConnectUids(type, devices, await getConnectOverrides(type), priorities),
  });

  // Safety net for a manual switch that went ahead without the lock (it waited too long): if the snapshot changed
  // while this run was reading the devices, its decision is stale. Leave everything as it is; the next run decides
  // from the new snapshot.
  if (!sameSnapshot(await getSnapshot(type), prev)) return;

  let currentUid = current.uid;
  const device = target ? devices.find((d) => d.uid === target) : undefined;
  if (device) {
    // If this throws, the snapshot is not updated, so the next run reaches the same decision and retries.
    await setDefaultDevice(type, device.id);
    currentUid = device.uid;
  }
  await setSnapshot(type, makeSnapshot(refs, currentUid, now.ts));
}

/** Set every connected device with a pinned volume back to it. Also used by the open device list. */
export async function restorePinnedVolumes(type: IOType) {
  const pinned = await getAllPinnedVolumes(type);
  if (pinned.size === 0) return;

  const [devices, volumes] = await Promise.all([getDevices(type), getAllVolumeInfo(type)]);
  for (const device of devices) {
    const level = pinned.get(device.uid);
    const volume = volumes[device.id]?.volume;
    if (level == null || volume == null) continue;
    if (pinnedVolumeDrifted(volume, level)) {
      await setVolume(type, device.id, level / 100).catch((error) =>
        console.error(`Could not restore the volume of ${device.name}:`, error),
      );
    }
  }
}

/**
 * "Output: Speakers | Input: Desk Mic | 2 pinned", shown under the command in Raycast: the devices in use after
 * this run, with their custom names. Raycast only updates it when the command runs.
 */
async function summary(): Promise<string> {
  const parts: string[] = [];
  for (const type of ["output", "input"] as const) {
    try {
      const [current, meta] = await Promise.all([getDefaultDevice(type), getDeviceMeta(type)]);
      parts.push(`${type === "output" ? "Output" : "Input"}: ${displayName(current.name, meta[current.uid])}`);
    } catch {
      // No device in this direction (or it could not be read): leave it out.
    }
  }
  const pinnedCount = (await getAllPinnedVolumes("output")).size + (await getAllPinnedVolumes("input")).size;
  if (pinnedCount > 0) parts.push(`${pinnedCount} pinned`);
  return parts.length > 0 ? parts.join(" | ") : "No priorities or pinned volumes";
}

export async function runAutoSwitch() {
  const errors: string[] = [];
  for (const type of ["output", "input"] as const) {
    try {
      await applyPriorities(type);
      await restorePinnedVolumes(type);
    } catch (error) {
      console.error(`Auto Switch failed for ${type}:`, error);
      errors.push(`${type === "output" ? "Output" : "Input"}: ${errorMessage(error)}`);
    }
  }

  // After switching, so it shows the devices now in use. Background runs show no toast, so a failure is shown here.
  const subtitle = errors.length > 0 ? "Last run failed: open this command to see why" : await summary();
  await updateCommandMetadata({ subtitle });

  if (environment.launchType === LaunchType.UserInitiated) {
    if (errors.length > 0) await showFailureToast(errors.join("\n"), { title: "Auto Switch failed" });
    else await showToast(Toast.Style.Success, "Auto Switch is running", subtitle);
  }
}
