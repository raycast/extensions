import { Cache, closeMainWindow, Icon, launchCommand, LaunchType, showHUD } from "@raycast/api";

const cache = new Cache();

export interface Focus {
  text: string;
  icon?: "email" | "task" | "browser" | "none";
}

export async function showFocus(focus: Focus) {
  cache.set("focus-text", focus.text);
  cache.set("focus-icon", focus?.icon ?? "none");

  if (focus) {
    cache.set("last-reminder", Date.now().toString());
    cache.set("paused", "false");
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    await showHUD(focus.text);
  } else {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    await closeMainWindow();
  }
}

export async function pauseFocus() {
  cache.set("paused", "true");
  await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  await closeMainWindow();
}

export function isPaused() {
  return cache.get("paused") === "true";
}

export function getFocus(): Focus {
  const text = cache.get("focus-text") ?? "";
  const icon = (cache.get("focus-icon") ?? "none") as Focus["icon"];
  return { text, icon };
}

export function getIcon(name?: Focus["icon"]) {
  switch (name) {
    case "task":
      return Icon.Checkmark;
    case "email":
      return Icon.AtSymbol;
    case "browser":
      return Icon.Globe;
    default:
      return undefined;
  }
}

export function getLastReminder() {
  return parseInt(cache.get("last-reminder") ?? "0");
}
