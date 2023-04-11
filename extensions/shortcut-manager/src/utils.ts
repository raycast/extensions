import {
  Alert,
  LocalStorage,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { ModifierKeys, SupportedApplications } from "./assets/constants";
import { $_SM_getApps, $_SM_getShortcuts, $_SM_setApps, $_SM_setShortcuts } from "./assets/mixins";

export interface App {
  title: string;
  source: string;
  icon: string;
}

export function AppDefault(): App {
  return { title: "System", source: "system", icon: "apps/system.png" };
}

export interface Shortcut {
  uuid: string;
  command: string;
  when: string;
  hotkey: string[];
}

export function ShortcutDefault(): Shortcut {
  return { uuid: randomUUID(), command: "", when: "", hotkey: [] };
}

export interface Logo {
  title: string;
  source: string;
  path: string;
}

export function LogoDefault(): Logo {
  return { title: "", source: "", path: "" };
}

// hotkey to pretty string
export function hotkeyToString(hotkeys: string[]): string {
  let hotkey = "";
  hotkeys.forEach((el) => {
    hotkey += el + " + ";
  });

  hotkey = hotkey.slice(0, hotkey.length - 2).trim();
  return hotkey;
}

// This function moves modifier keys to the front of the array
export function formatHotkey(hotkeys: string[]) {
  ModifierKeys.reverse().forEach((key) => {
    const idx = hotkeys.findIndex((el) => el === key);
    if (idx >= 0) {
      hotkeys.splice(0, 0, hotkeys.splice(idx, 1)[0]);
    }
  });
}

export function arrayEmpty(data: string[] | Shortcut[] | App[]): boolean {
  return data.length === 0;
}

export function arraysEqual(a: string[], b: string[]) {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

export async function hasHotkeyConflicts(uuid: string, hotkey: string[], source: string): Promise<boolean> {
  const appsToCheck = ["system", "raycast"];
  if (!appsToCheck.includes(source)) {
    appsToCheck.push(source);
  }

  hotkey.sort();

  for (let i = 0; i < appsToCheck.length; ++i) {
    const shortcuts = (await $_SM_getShortcuts(appsToCheck[i])).filter((el) => el.uuid !== uuid);
    for (let j = 0; j < shortcuts.length; ++j) {
      const clone = structuredClone(shortcuts[j].hotkey).sort();
      if (arraysEqual(clone, hotkey)) {
        return true;
      }
    }
  }

  return false;
}

// modifies array in place
export function addPreferencesToArray(data: App[]) {
  const preferences = getPreferenceValues();

  Object.keys(preferences).forEach((key) => {
    if (preferences[key]) {
      const idx = SupportedApplications.findIndex((el) => el.source === key);
      if (idx >= 0 && !data.some((el) => el.source === key)) {
        data.push(SupportedApplications[idx]);
      }
    } else {
      // just desk checking that data does not contain non preference
      const idx = data.findIndex((el) => el.source === key);
      if (idx >= 0) {
        data.splice(idx, 1);
      }
    }
  });
}

export async function confirm(title: string): Promise<boolean> {
  const options: Alert.Options = {
    title,
    message: "You will not be able to recover it.",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };

  return !(await confirmAlert(options));
}

export async function deleteApp(app: App) {
  if (await confirm("Delete Application")) {
    return;
  }

  if (SupportedApplications.some((el) => el.source === app.source)) {
    const options: Alert.Options = {
      title: "Supported Application!",
      message: "Head to preferences to disable?",
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Default,
      },
    };

    if (await confirmAlert(options)) {
      await openExtensionPreferences();
    }

    return;
  }

  const apps = (await $_SM_getApps()).filter((el) => el.source !== app.source);
  await $_SM_setApps(apps);
  showToast({
    title: "Application Deleted",
    style: Toast.Style.Success,
  });
  popToRoot();
}

export async function cleanAndInitialize(apps: App[]) {
  interface ShortcutState {
    source: string;
    shortcuts: Shortcut[];
  }

  addPreferencesToArray(apps);

  apps.sort((a, b) => {
    if (a.source > b.source) {
      return 1;
    }

    if (a.source < b.source) {
      return -1;
    }

    return 0;
  });

  const newShortcutsState: ShortcutState[] = [];
  apps.forEach(async (app) => {
    const shortcuts = await $_SM_getShortcuts(app.source);
    newShortcutsState.push({
      source: app.source,
      shortcuts,
    });
  });

  await LocalStorage.clear();

  await $_SM_setApps(apps);
  newShortcutsState.forEach(async (state) => {
    await $_SM_setShortcuts(state.source, state.shortcuts);
  });
}
