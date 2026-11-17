import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import type { RenderOptions } from "@xeet/core";
import { homedir } from "node:os";
import { join } from "node:path";

export type Options = Required<Pick<RenderOptions, "surface" | "theme" | "width" | "dpr" | "expanded">>;
export const surfaces = {
  "web-timeline": "Web Timeline",
  "web-detail": "Web Detail",
  "ios-timeline": "iOS Timeline",
  "ios-detail": "iOS Detail",
} as const;
export const settings = () => getPreferenceValues<Preferences>();
export const previewDirectory = () => join(environment.supportPath, "previews");
export const cacheDirectory = () => join(environment.supportPath, "resolved");
export const exportDirectory = () => settings().exportDirectory || join(homedir(), "Downloads");

export function defaultOptions(): Options {
  const preferences = settings();
  return {
    surface: preferences.surface || "web-timeline",
    width: Number(preferences.width || 390),
    dpr: Number(preferences.dpr || 2),
    theme: preferences.theme === "system" || !preferences.theme ? environment.appearance : preferences.theme,
    expanded: false,
  };
}

export async function saveOptions(options: Options) {
  await LocalStorage.setItem("last-options", JSON.stringify(options));
}

export async function lastOptions(): Promise<Options> {
  const saved = await LocalStorage.getItem<string>("last-options");
  if (!saved) return defaultOptions();
  try {
    const options = JSON.parse(saved) as Options;
    if (
      !(options.surface in surfaces) ||
      ![320, 390, 600].includes(options.width) ||
      ![1, 2, 3].includes(options.dpr) ||
      !["light", "dark"].includes(options.theme) ||
      typeof options.expanded !== "boolean"
    )
      return defaultOptions();
    // A Follow Raycast preference continues following appearance between runs.
    return { ...options, theme: settings().theme === "system" ? environment.appearance : options.theme };
  } catch {
    return defaultOptions();
  }
}
