import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { ActionType, Result, ShortcutKeyType } from "../types";

export type MenuBarShortcut = {
  name: string;
  menuBarId: string;
  actionType: ActionType;
  keySequence: ShortcutKeyType[];
  customClickDelay?: number;
  customKeypressDelay?: number;
};

export type ShortcutFunctions = {
  addShortcut: (shortcut: MenuBarShortcut) => Promise<Result<void>>;
  updateShortcut: (originalName: string, updatedShortcut: MenuBarShortcut) => Promise<Result<void>>;
  deleteShortcut: (name: string) => Promise<void>;
  deleteAllShortcuts: () => Promise<void>;
};

const STORAGE_KEY = "menu-bar-shortcuts";

export async function getStoredShortcuts(): Promise<MenuBarShortcut[]> {
  const json = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (json) {
    try {
      return JSON.parse(json) as MenuBarShortcut[];
    } catch (e) {
      console.error("Failed to parse cached shortcuts:", e);
    }
  }
  return [];
}

export function useMenuBarShortcuts(): {
  data: MenuBarShortcut[] | undefined;
  isLoading: boolean;
} & ShortcutFunctions {
  const { value, setValue, ...localRest } = useLocalStorage<MenuBarShortcut[]>(STORAGE_KEY, []);
  const storedShortcuts = value || [];

  return {
    data: value,
    isLoading: localRest.isLoading,

    addShortcut: async (shortcut: MenuBarShortcut): Promise<Result<void>> => {
      const exists = storedShortcuts.some((s) => s.name === shortcut.name);
      if (exists) {
        return {
          status: "error",
          error: `A shortcut with the name "${shortcut.name}" already exists`,
        };
      }

      const storedMenuBarShortcuts = [...storedShortcuts, shortcut];
      await setValue(storedMenuBarShortcuts);
      return { status: "success" };
    },

    updateShortcut: async (originalName: string, updatedShortcut: MenuBarShortcut): Promise<Result<void>> => {
      // If the name hasn't changed, simply update the shortcut
      if (originalName === updatedShortcut.name) {
        await setValue(storedShortcuts.map((s) => (s.name === originalName ? updatedShortcut : s)));
        return { status: "success" };
      }

      // If the name has changed, check if the new name already exists
      const exists = storedShortcuts.some((s) => s.name === updatedShortcut.name);
      if (exists) {
        return {
          status: "error",
          error: `A shortcut with the name "${updatedShortcut.name}" already exists`,
        };
      }

      // Delete the old shortcut and add the new one
      const filtered = storedShortcuts.filter((s) => s.name !== originalName);
      await setValue([...filtered, updatedShortcut]);

      return { status: "success" };
    },

    deleteShortcut: async (name: string): Promise<void> => {
      await setValue(storedShortcuts.filter((s) => s.name !== name));
    },
    deleteAllShortcuts: async () => {
      await setValue([]);
    },
  };
}
