import { useState, useEffect, useMemo } from "react";
import { showToast, Toast } from "@raycast/api";
import { loadHotkeyAssignments, saveHotkeyAssignments } from "../utils/storage";

interface UseHotkeysResult {
  hotkeyAssignments: Map<string, string>;
  reverseHotkeyMap: Map<string, string>;
  hotkeysLoaded: boolean;
  assignHotkey: (appName: string, hotkey: string) => Promise<void>;
  removeHotkey: (appName: string, hotkey: string) => Promise<void>;
  getHotkeyForApp: (appName: string) => string | undefined;
  getAppForHotkey: (hotkey: string) => string | undefined;
}

/**
 * Hook for managing hotkey assignments and lookups
 */
export function useHotkeys(): UseHotkeysResult {
  const [hotkeyAssignments, setHotkeyAssignments] = useState<Map<string, string>>(new Map());
  const [hotkeysLoaded, setHotkeysLoaded] = useState(false);

  // Load hotkeys on mount
  useEffect(() => {
    async function loadHotkeys() {
      const assignments = await loadHotkeyAssignments();
      setHotkeyAssignments(assignments);
      setHotkeysLoaded(true);
    }

    loadHotkeys();
  }, []);

  // Create reverse hotkey map for O(1) lookups (app name -> hotkey)
  const reverseHotkeyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [hotkey, appName] of hotkeyAssignments.entries()) {
      map.set(appName, hotkey);
    }
    return map;
  }, [hotkeyAssignments]);

  /**
   * Assign a hotkey to an app
   */
  async function assignHotkey(appName: string, hotkey: string): Promise<void> {
    try {
      // Check for conflicts
      for (const existingHotkey of hotkeyAssignments.keys()) {
        // Check if new hotkey starts with existing (e.g., "ff" conflicts with "f")
        if (hotkey.startsWith(existingHotkey)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Hotkey Conflict",
            message: `"${hotkey}" conflicts with existing hotkey "${existingHotkey}"`,
          });
          return;
        }
        // Check if existing hotkey starts with new (e.g., "f" conflicts with "ff")
        if (existingHotkey.startsWith(hotkey)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Hotkey Conflict",
            message: `"${hotkey}" conflicts with existing hotkey "${existingHotkey}"`,
          });
          return;
        }
      }

      // Update the hotkey assignments
      const newAssignments = new Map(hotkeyAssignments);
      newAssignments.set(hotkey, appName);

      // Save to LocalStorage
      await saveHotkeyAssignments(newAssignments);

      // Update state
      setHotkeyAssignments(newAssignments);

      await showToast({
        style: Toast.Style.Success,
        title: "Hotkey Assigned",
        message: `"${hotkey}" assigned to ${appName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to assign hotkey",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Remove a hotkey assignment
   */
  async function removeHotkey(appName: string, hotkey: string): Promise<void> {
    try {
      // Remove the hotkey assignment
      const newAssignments = new Map(hotkeyAssignments);
      newAssignments.delete(hotkey);

      // Save to LocalStorage
      await saveHotkeyAssignments(newAssignments);

      // Update state
      setHotkeyAssignments(newAssignments);

      await showToast({
        style: Toast.Style.Success,
        title: "Hotkey Removed",
        message: `"${hotkey}" removed from ${appName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove hotkey",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get hotkey for an app name
   */
  function getHotkeyForApp(appName: string): string | undefined {
    return reverseHotkeyMap.get(appName);
  }

  /**
   * Get app name for a hotkey
   */
  function getAppForHotkey(hotkey: string): string | undefined {
    return hotkeyAssignments.get(hotkey.toLowerCase());
  }

  return {
    hotkeyAssignments,
    reverseHotkeyMap,
    hotkeysLoaded,
    assignHotkey,
    removeHotkey,
    getHotkeyForApp,
    getAppForHotkey,
  };
}
