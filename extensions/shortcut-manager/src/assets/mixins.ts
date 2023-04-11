import { LocalStorage } from "@raycast/api";
import { App, Shortcut, cleanAndInitialize } from "../utils";

export async function $_SM_getApps(): Promise<App[]> {
  const apps: string | undefined = await LocalStorage.getItem("apps");
  if (apps) {
    return JSON.parse(apps);
  }

  return [];
}

export async function $_SM_setApps(apps: App[]) {
  await LocalStorage.setItem("apps", JSON.stringify(apps));
}

export async function $_SM_getShortcuts(source: string): Promise<Shortcut[]> {
  const shortcuts: string | undefined = await LocalStorage.getItem(source);

  if (shortcuts) {
    return JSON.parse(shortcuts);
  }

  return [];
}

export async function $_SM_setShortcuts(source: string, shortcuts: Shortcut[]) {
  await LocalStorage.setItem(source, JSON.stringify(shortcuts));
}

export async function $_SM_initializeState() {
  const DefaultState = [
    {
      title: "System",
      source: "system",
      icon: "apps/system.png",
    },
    {
      title: "Raycast",
      source: "raycast",
      icon: "apps/raycast.png",
    },
  ];

  const stringifiedApps: string | undefined = await LocalStorage.getItem("apps");

  if (!stringifiedApps) {
    await cleanAndInitialize(DefaultState);
    return;
  }

  const apps: App[] = JSON.parse(stringifiedApps);

  // make sure system is always available
  if (!apps.find((el) => el.source === DefaultState[0].source)) {
    apps.push(DefaultState[0]);
  }

  // make sure raycast is always available
  if (!apps.find((el) => el.source === DefaultState[1].source)) {
    apps.push(DefaultState[1]);
  }

  await cleanAndInitialize(apps);
}
