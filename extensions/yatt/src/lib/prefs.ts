import { getPreferenceValues } from "@raycast/api";
import type { HourRange, Preferences } from "../core/types";
import { parseHourRange, type Shade } from "../core/business";

export type Prefs = Required<Preferences> & {
  business: HourRange;
  shoulder: HourRange;
  /** Hex overrides per shade for dots and menu bar; undefined keeps Raycast's theme colours. */
  colors: Partial<Record<Shade, string>>;
  /** Hex overrides per shade for the hour strip; undefined keeps its built-in palette. */
  stripColors: Partial<Record<Shade, string>>;
};

/** "#abc" or "#aabbcc", any case; anything else is ignored. */
export function parseHex(s: string | undefined): string | undefined {
  const t = s?.trim() ?? "";
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) ? t : undefined;
}

/** Preferences with defaults filled in; a command sees only its own command-level values, the rest default. */
export function getPrefs(): Prefs {
  const p = getPreferenceValues<Preferences>();
  return {
    timeFormat: p.timeFormat === "12h" ? "12h" : "24h",
    copyTemplate: p.copyTemplate?.trim() || "{time} {code} ({abbr})",
    copySeparator: p.copySeparator ?? " / ",
    sortOrder: p.sortOrder ?? "offset",
    businessHours: p.businessHours ?? "9-18",
    shoulderHours: p.shoulderHours ?? "7-21",
    colorBusiness: p.colorBusiness ?? "",
    colorShoulder: p.colorShoulder ?? "",
    colorOff: p.colorOff ?? "",
    stripColorBusiness: p.stripColorBusiness ?? "",
    stripColorShoulder: p.stripColorShoulder ?? "",
    stripColorOff: p.stripColorOff ?? "",
    locationsFile: p.locationsFile ?? "",
    defaultAnchor: p.defaultAnchor ?? "local",
    popToRootAfterCopy: p.popToRootAfterCopy ?? true,
    showLocalRow: p.showLocalRow ?? true,
    dateOrder: p.dateOrder ?? "dmy",
    menuBarTemplate: p.menuBarTemplate?.trim() || "{code} {time}",
    menuBarSeparator: p.menuBarSeparator ?? " • ",
    menuBarIcon: p.menuBarIcon ?? true,
    onlineLookup: p.onlineLookup ?? true,
    business: parseHourRange(p.businessHours) ?? { start: 9, end: 18 },
    shoulder: parseHourRange(p.shoulderHours) ?? { start: 7, end: 21 },
    colors: { business: parseHex(p.colorBusiness), shoulder: parseHex(p.colorShoulder), off: parseHex(p.colorOff) },
    stripColors: {
      business: parseHex(p.stripColorBusiness),
      shoulder: parseHex(p.stripColorShoulder),
      off: parseHex(p.stripColorOff),
    },
  };
}

export function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
