import { Result } from "../types";
import { MenuBarShortcut, useMenuBarShortcuts } from "./useMenuBarShortcuts";
import { usePinned } from "./usePinned";

export function usePinnedMenuBarShortcuts() {
  const { data, isLoading, ...shortcutFunctions } = useMenuBarShortcuts();
  const { pinned: pinnedShortcutNames, ...pinnedFunctions } = usePinned("shortcut-names");

  const updateShortcut = async (originalName: string, updatedShortcut: MenuBarShortcut): Promise<Result<void>> => {
    const result = await shortcutFunctions.updateShortcut(originalName, updatedShortcut);

    if (result.status === "success" && originalName !== updatedShortcut.name) {
      if (pinnedShortcutNames.includes(originalName)) {
        pinnedFunctions.replace(originalName, updatedShortcut.name);
      }
    }

    return result;
  };

  const deleteShortcut = async (name: string): Promise<void> => {
    await shortcutFunctions.deleteShortcut(name);
    pinnedFunctions.togglePin(name, false);
  };

  const deleteAllShortcuts = async (): Promise<void> => {
    await shortcutFunctions.deleteAllShortcuts();
    pinnedFunctions.unpinAll();
  };

  const pinned = data
    ? pinnedShortcutNames
        .map((name) => data.find((shortcut) => shortcut.name === name))
        .filter((shortcut): shortcut is (typeof data)[number] => !!shortcut)
    : undefined;
  const unpinned = data?.filter((shortcut) => !pinnedShortcutNames.includes(shortcut.name)) || undefined;

  const enhancedShortcutFunctions = {
    ...shortcutFunctions,
    updateShortcut,
    deleteShortcut,
    deleteAllShortcuts,
  };

  return {
    isLoading,
    pinned,
    unpinned,
    shortcutFunctions: enhancedShortcutFunctions,
    pinnedFunctions,
  };
}
