import { useLocalStorage } from "@raycast/utils";
import { Device } from "../lib/devices";
import { getDeviceKey, HIDDEN_KEY, PINNED_KEY } from "../lib/organization";

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The devices the user pinned to the top of the list or hid from it. Stored on this Mac only. */
export function useOrganization() {
  const pinned = useLocalStorage<string[]>(PINNED_KEY, []);
  const hidden = useLocalStorage<string[]>(HIDDEN_KEY, []);
  const pinnedKeys = pinned.value ?? [];
  const hiddenKeys = hidden.value ?? [];

  return {
    isLoading: pinned.isLoading || hidden.isLoading,
    pinnedKeys,
    hiddenKeys,
    isPinned: (device: Device) => pinnedKeys.includes(getDeviceKey(device)),
    isHidden: (device: Device) => hiddenKeys.includes(getDeviceKey(device)),
    pinIndex: (device: Device) => pinnedKeys.indexOf(getDeviceKey(device)),
    pin: async (device: Device) => {
      const key = getDeviceKey(device);
      await pinned.setValue([...pinnedKeys.filter((item) => item !== key), key]);
      // A pinned device is one you use, so it can't stay hidden.
      await hidden.setValue(hiddenKeys.filter((item) => item !== key));
    },
    unpin: async (device: Device) => {
      const key = getDeviceKey(device);
      await pinned.setValue(pinnedKeys.filter((item) => item !== key));
    },
    movePin: async (device: Device, offset: -1 | 1) => {
      const index = pinnedKeys.indexOf(getDeviceKey(device));
      const target = index + offset;
      if (index === -1 || target < 0 || target >= pinnedKeys.length) return;
      await pinned.setValue(move(pinnedKeys, index, target));
    },
    hide: async (device: Device) => {
      const key = getDeviceKey(device);
      await hidden.setValue([...hiddenKeys.filter((item) => item !== key), key]);
      await pinned.setValue(pinnedKeys.filter((item) => item !== key));
    },
    unhide: async (device: Device) => {
      const key = getDeviceKey(device);
      await hidden.setValue(hiddenKeys.filter((item) => item !== key));
    },
  };
}

export type Organization = ReturnType<typeof useOrganization>;
