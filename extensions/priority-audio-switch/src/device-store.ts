// State of the device list that the user changes, with optimistic updates: the list shows a change at once and
// the write to LocalStorage runs in the background (rolled back if it fails).
import { usePromise } from "@raycast/utils";
import type { IOType } from "./audio-device";
import {
  getAllPinnedVolumes,
  getConnectOverrides,
  getDeviceMeta,
  getHiddenDevices,
  getPriorityList,
  isShowingHiddenDevices,
  setConnectOverride,
  setDeviceMeta,
  setPinnedVolume,
  setPriorityList,
  setShowHiddenDevices,
  toggleDeviceVisibility,
} from "./device-preferences";
import type { ConnectMode, ConnectOverrides } from "./priority/connect-mode";
import type { PriorityEntry } from "./priority/decide";
import { removeEntry } from "./priority/list";
import { displayName, setMeta, type DeviceMeta, type DeviceMetaMap } from "./priority/meta";

export type PriorityChange = {
  /** The new priority list. */
  priorities?: PriorityEntry[];
  /** A Switch on Connect choice for one device; undefined mode goes back to the default. */
  connect?: { uid: string; mode: ConnectMode | undefined };
};

export type DeviceStore = ReturnType<typeof useDeviceStore>;

export function useDeviceStore(ioType: IOType) {
  const priorities = usePromise(getPriorityList, [ioType]);
  const connectModes = usePromise(getConnectOverrides, [ioType]);
  const hidden = usePromise(getHiddenDevices, [ioType]);
  const showHidden = usePromise(isShowingHiddenDevices, [ioType]);
  const pinned = usePromise(getAllPinnedVolumes, [ioType]);
  const meta = usePromise(getDeviceMeta, [ioType]);

  const changePriorities = async ({ priorities: next, connect }: PriorityChange) => {
    const writes: Promise<unknown>[] = [];
    if (next) {
      writes.push(priorities.mutate(setPriorityList(ioType, next), { optimisticUpdate: () => next }));
    }
    if (connect) {
      writes.push(
        connectModes.mutate(setConnectOverride(ioType, connect.uid, connect.mode), {
          optimisticUpdate: (current: ConnectOverrides | undefined) => {
            const result = { ...current };
            if (connect.mode) result[connect.uid] = connect.mode;
            else delete result[connect.uid];
            return result;
          },
        }),
      );
    }
    await Promise.all(writes);
  };

  /** Hide or show a device. A hidden device loses its priority. */
  const toggleHidden = async (uid: string) => {
    const isHidden = (hidden.data ?? []).includes(uid);
    const writes: Promise<unknown>[] = [
      hidden.mutate(toggleDeviceVisibility(ioType, uid), {
        optimisticUpdate: (current: string[] | undefined) =>
          isHidden ? (current ?? []).filter((u) => u !== uid) : [...(current ?? []), uid],
      }),
    ];
    if (!isHidden && (priorities.data ?? []).some((p) => p.uid === uid)) {
      const next = removeEntry(priorities.data ?? [], uid);
      writes.push(priorities.mutate(setPriorityList(ioType, next), { optimisticUpdate: () => next }));
    }
    await Promise.all(writes);
  };

  const setShowHidden = (show: boolean) =>
    showHidden.mutate(setShowHiddenDevices(ioType, show), { optimisticUpdate: () => show });

  /** Pin the volume (0–100) of a device, or unpin with undefined. */
  const setPinned = (uid: string, level: number | undefined) =>
    pinned.mutate(setPinnedVolume(ioType, uid, level), {
      optimisticUpdate: (current: Map<string, number> | undefined) => {
        const result = new Map(current);
        if (level === undefined) result.delete(uid);
        else result.set(uid, Math.round(level));
        return result;
      },
    });

  const updateMeta = (uid: string, value: DeviceMeta, systemName: string) =>
    meta.mutate(setDeviceMeta(ioType, uid, value, systemName), {
      optimisticUpdate: (current: DeviceMetaMap | undefined) => setMeta(current ?? {}, uid, value, systemName),
    });

  /** The name shown to the user: the custom name from Customize Device, or the system name. */
  const nameOf = (device: { uid: string; name: string }) => displayName(device.name, meta.data?.[device.uid]);

  return {
    ioType,
    nameOf,
    priorities: priorities.data ?? [],
    connectModes: connectModes.data ?? {},
    hidden: hidden.data ?? [],
    isShowingHidden: showHidden.data ?? false,
    pinned: pinned.data ?? new Map<string, number>(),
    meta: meta.data ?? {},
    isLoading: hidden.isLoading || showHidden.isLoading,
    /** Re-read the priorities, after something outside the store (Auto Switch) changed them. */
    reloadPriorities: priorities.revalidate,
    changePriorities,
    toggleHidden,
    setShowHidden,
    setPinned,
    updateMeta,
  };
}
