import { Cache, getPreferenceValues, Action, Icon, Color, Toast, showToast } from "@raycast/api";
import { Preferences, moduleitem } from "./types";
import { create } from "zustand";
import React from "react";

const preferences: Preferences = getPreferenceValues();
export const showRecent = preferences.showRecent;
const numRecent = parseInt(preferences.numRecent);

const cache = new Cache();

const getModuleItems = (key: number, type: string): moduleitem[] => {
  const json: string | undefined = cache.get(`${key}-${type}-moduleitems`);
  if (json) {
    return JSON.parse(json);
  } else {
    return [];
  }
};

export const getRecents = (key: number): moduleitem[] => {
  return getModuleItems(key, "recent");
};

export const getPinneds = (key: number): moduleitem[] => {
  return getModuleItems(key, "pinned");
};

const appendModuleItem = (key: number, type: string, item: moduleitem, limit = false): void => {
  let items = getModuleItems(key, type);
  items = removeItem(items, item.id);
  items.unshift(item);
  if (limit && items.length >= numRecent) items.pop();
  cache.set(`${key}-${type}-moduleitems`, JSON.stringify(items));
};

export const addRecent = (key: number, item: moduleitem): void => {
  const pinned = getPinneds(key);
  if (pinned.some((i) => i.id === item.id)) return;
  appendModuleItem(key, "recent", item, true);
};

export const addPinned = (key: number, item: moduleitem): void => {
  removeRecent(key, item.id);
  appendModuleItem(key, "pinned", item);
};

export const clearRecents = (key: number): void => {
  cache.set(`${key}-recent-moduleitems`, JSON.stringify([]));
};

export const clearPinned = (key: number): void => {
  cache.set(`${key}-pinned-moduleitems`, JSON.stringify([]));
};

const removeItem = (array: moduleitem[], id: string): moduleitem[] => {
  return array.filter((i: moduleitem) => i.id !== id);
};

const removeModuleItem = (key: number, type: string, id: string): void => {
  let items = getModuleItems(key, type);
  items = removeItem(items, id);
  cache.set(`${key}-${type}-moduleitems`, JSON.stringify(items));
};

export const removeRecent = (key: number, id: string): void => {
  removeModuleItem(key, "recent", id);
};

export const removePinned = (key: number, id: string): void => {
  removeModuleItem(key, "pinned", id);
};

export const checkIsTopPinned = (key: number, id: string): boolean => {
  const pinned = getPinneds(key);
  return pinned.length > 0 && pinned[0].id === id;
};

export const checkIsBottomPinned = (key: number, id: string): boolean => {
  const pinned = getPinneds(key);
  return pinned.length > 0 && pinned[pinned.length - 1].id === id;
};

export const moveUpPinnedItem = (key: number, id: string | undefined) => {
  const pinned = getPinneds(key);
  const index = pinned.findIndex((i) => i.id === id);
  if (index > 0) {
    pinned.splice(index - 1, 2, pinned[index], pinned[index - 1]);
    cache.set(`${key}-pinned-moduleitems`, JSON.stringify(pinned));
  }
};

export const moveDownPinnedItem = (key: number, id: string | undefined) => {
  const pinned = getPinneds(key);
  const index = pinned.findIndex((i) => i.id === id);
  if (index < pinned.length - 1) {
    pinned.splice(index, 2, pinned[index + 1], pinned[index]);
    cache.set(`${key}-pinned-moduleitems`, JSON.stringify(pinned));
  }
};

interface ModuleStore {
  recentItems: Record<number, moduleitem[]>;
  pinnedItems: Record<number, moduleitem[]>;
  refreshModuleItems: (id: number) => void;
  addToRecent: (id: number, item: moduleitem) => void;
  removeFromRecent: (id: number, itemId: string) => void;
  clearRecentItems: (id: number) => void;
  addToPinned: (id: number, item: moduleitem) => void;
  removeFromPinned: (id: number, itemId: string) => void;
  clearPinnedItems: (id: number) => void;
  isTopPinned: (id: number, itemId: string) => boolean;
  isBottomPinned: (id: number, itemId: string) => boolean;
  moveUpPinned: (id: number, itemId: string) => void;
  moveDownPinned: (id: number, itemId: string) => void;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  recentItems: {},
  pinnedItems: {},

  refreshModuleItems: (id: number) => {
    set({
      recentItems: {
        ...get().recentItems,
        [id]: getRecents(id),
      },
      pinnedItems: {
        ...get().pinnedItems,
        [id]: getPinneds(id),
      },
    });
  },

  addToRecent: (id: number, item: moduleitem) => {
    addRecent(id, item);
    get().refreshModuleItems(id);
  },

  removeFromRecent: (id: number, itemId: string) => {
    removeRecent(id, itemId);
    get().refreshModuleItems(id);
  },

  clearRecentItems: (id: number) => {
    clearRecents(id);
    get().refreshModuleItems(id);
  },

  addToPinned: (id: number, item: moduleitem) => {
    addPinned(id, item);
    get().refreshModuleItems(id);
  },

  removeFromPinned: (id: number, itemId: string) => {
    removePinned(id, itemId);
    get().refreshModuleItems(id);
  },

  clearPinnedItems: (id: number) => {
    clearPinned(id);
    get().refreshModuleItems(id);
  },

  isTopPinned: (id: number, itemId: string) => {
    return checkIsTopPinned(id, itemId);
  },

  isBottomPinned: (id: number, itemId: string) => {
    return checkIsBottomPinned(id, itemId);
  },

  moveUpPinned: (id: number, itemId: string) => {
    moveUpPinnedItem(id, itemId);
    get().refreshModuleItems(id);
  },

  moveDownPinned: (id: number, itemId: string) => {
    moveDownPinnedItem(id, itemId);
    get().refreshModuleItems(id);
  },
}));

interface PinActionsProps {
  id: number;
  item: moduleitem;
  isPinned: boolean;
}

export const PinActions: React.FC<PinActionsProps> = ({ id, item, isPinned }) => {
  const { addToPinned, removeFromPinned, clearPinnedItems, isTopPinned, isBottomPinned, moveUpPinned, moveDownPinned } =
    useModuleStore();

  if (!isPinned) {
    return (
      <Action
        title="Pin Item"
        icon={{ source: Icon.Pin }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={() => {
          addToPinned(id, item);
          showToast(Toast.Style.Success, "Item Pinned");
        }}
      />
    );
  }

  return (
    <>
      {!isTopPinned(id, item.id) && (
        <Action
          title="Move Up in Pinned"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          icon={{ source: Icon.ArrowUp }}
          onAction={() => {
            moveUpPinned(id, item.id);
          }}
        />
      )}
      {!isBottomPinned(id, item.id) && (
        <Action
          title="Move Down in Pinned"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          icon={{ source: Icon.ArrowDown }}
          onAction={() => {
            moveDownPinned(id, item.id);
          }}
        />
      )}
      <Action
        title="Remove Pinned Item"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={{ source: Icon.PinDisabled }}
        onAction={() => {
          removeFromPinned(id, item.id);
          showToast(Toast.Style.Success, `Removed Pinned Item`);
        }}
      />
      <Action
        title="Clear Pinned Items"
        icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={() => {
          clearPinnedItems(id);
          showToast(Toast.Style.Success, "Pinned Items Cleared");
        }}
      />
    </>
  );
};

interface RecentActionsProps {
  id: number;
  item: moduleitem;
}

export const RecentActions: React.FC<RecentActionsProps> = ({ id, item }) => {
  const { removeFromRecent, clearRecentItems } = useModuleStore();

  return (
    <>
      <Action
        title="Remove Recent Item"
        onAction={() => {
          removeFromRecent(id, item.id);
          showToast(Toast.Style.Success, "Recent Item Removed");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear Recent Items"
        onAction={() => {
          clearRecentItems(id);
          showToast(Toast.Style.Success, "Recent Items Cleared");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </>
  );
};
