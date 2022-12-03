import { Cache, closeMainWindow, Icon, launchCommand, LaunchType, showHUD } from "@raycast/api";

const cache = new Cache();

export interface Focus {
  text: string;
  icon?: "email" | "task" | "browser" | "none";
}

export function getFocusHistory(): Focus[] {
  return JSON.parse(cache.get("focus-history") ?? "[]");
}

export async function showFocus(nextFocus: Focus, { background = true, hud = true } = {}) {
  const currentFocus = getFocus();

  cache.set("focus-text", nextFocus.text);
  cache.set("focus-icon", nextFocus?.icon ?? "none");

  if (currentFocus.text !== nextFocus.text) {
    const history = JSON.parse(cache.get("focus-history") ?? "[]");
    cache.set("focus-history", JSON.stringify([currentFocus, ...history].slice(0, 9)));
  }

  if (nextFocus) {
    cache.set("last-reminder", Date.now().toString());
    cache.set("paused", "false");
    if (background) {
      await launchCommand({name: "menu-bar", type: LaunchType.Background});
    }
    if (hud) {
      await showHUD(nextFocus.text);
    }
  } else {
    if (background) {
      await launchCommand({name: "menu-bar", type: LaunchType.Background});
    }
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
