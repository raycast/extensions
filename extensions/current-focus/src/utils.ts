import { Cache, closeMainWindow, launchCommand, LaunchType, showHUD } from "@raycast/api";

const cache = new Cache();

export interface Focus {
  text: string;
  icon?: "email" | "task" | "browser" | "none";
}

export async function startFocus(focus: Focus) {
  cache.set("focus-text", focus.text);
  cache.set("focus-icon", focus?.icon ?? "none");

  await launchCommand({ name: "menu-bar", type: LaunchType.Background });

  if (focus) {
    cache.set("last-reminder", Date.now().toString());
    cache.set("paused", "false");
    await showHUD(focus.text);
  } else {
    await closeMainWindow();
  }
}

export function getFocus(): Focus {
  const text = cache.get("focus-text") ?? "";
  const icon = (cache.get("focus-icon") ?? "none") as Focus["icon"];
  return { text, icon };
}
