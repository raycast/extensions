import { environment, getPreferenceValues } from "@raycast/api";
import { getNumberPref, writeJson } from "./storage";
import type { Preferences } from "./types";

/** raycast://extensions/<author>/<name>, used by the helper's menu items. */
export const deeplinkBase = () => `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}`;

export function parseExcluded(raw: string | undefined) {
  return (raw ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Preferences are only readable inside Raycast, so mirror them to config.json for the helper. */
export function writeHelperConfig() {
  const p = getPreferenceValues<Preferences>();
  const config = {
    maxHistory: getNumberPref("maxHistory", 30),
    itemsInline: getNumberPref("itemsInline", 0, 0),
    itemsPerFolder: getNumberPref("itemsPerFolder", 10),
    maxTitleLength: getNumberPref("maxTitleLength", 20),
    numbered: p.numbered ?? true,
    numericShortcuts: p.numericShortcuts ?? true,
    tooltip: p.tooltip ?? true,
    tooltipLength: 200,
    imagePreview: p.imagePreview ?? true,
    colorPreview: p.colorPreview ?? true,
    confirmClear: p.confirmClear ?? true,
    reorder: p.reorder ?? true,
    dedupe: p.dedupe ?? true,
    types: { rich: p.storeRich ?? true, image: p.storeImage ?? true, file: p.storeFile ?? true },
    excluded: parseExcluded(p.excludedApps),
    deeplinkBase: deeplinkBase(),
  };
  writeJson("config.json", config);
  return config;
}
