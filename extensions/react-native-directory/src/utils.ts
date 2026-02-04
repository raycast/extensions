import { Color } from "@raycast/api";
import { LibraryType, Query } from "./types";
import { compatibilityColors, moduleTypeColors, MUL, platformColors, SUFFIXES } from "./constants";

const toQueryString = (query: Partial<Query>): string => {
  return new URLSearchParams(query as Record<string, string>).toString();
};

export const urlWithQuery = (url: string, query: Query): string => {
  const queryWithoutEmptyParams: Partial<Query> = {};

  (Object.keys(query) as Array<keyof Query>).forEach((key) => {
    if (query[key]) {
      // @ts-expect-error Type 'string | number | boolean' is not assignable to type 'string'.
      // We're assuming all non-falsy values in query are valid for URLSearchParams.
      queryWithoutEmptyParams[key] = query[key];
    }
  });

  if (Object.keys(queryWithoutEmptyParams).length === 0) {
    return url;
  }

  return `${url}?${toQueryString(queryWithoutEmptyParams)}`;
};

export const pluralize = (text: string, count: number): string => {
  return count > 1 || count === 0 ? `${text}s` : text;
};

export const toCapitalCase = (str: string): string => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

export const isEmptyOrNull = (text: string) => {
  return !text || !text.trim();
};

export const TimeRange = Object.freeze({
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,
  WEEK: 60 * 60 * 24 * 7,
  MONTH: 60 * 60 * 24 * 30,
  YEAR: 60 * 60 * 24 * 365,
});

export const getTimeSinceToday = (date: string | Date): string => {
  const updateTimeSeconds = new Date(date).getTime();
  const currentTimeSeconds = new Date().getTime();

  const seconds = Math.abs(currentTimeSeconds - updateTimeSeconds) / 1000;
  const elapsed = seconds > 0 ? seconds : 1;

  const [value, unit] =
    elapsed < TimeRange.MINUTE
      ? [Math.round(elapsed), "second"]
      : elapsed < TimeRange.HOUR
        ? [Math.round(elapsed / TimeRange.MINUTE), "minute"]
        : elapsed < TimeRange.DAY
          ? [Math.round(elapsed / TimeRange.HOUR), "hour"]
          : elapsed < TimeRange.WEEK
            ? [Math.round(elapsed / TimeRange.DAY), "day"]
            : elapsed < TimeRange.MONTH
              ? [Math.round(elapsed / TimeRange.WEEK), "week"]
              : elapsed < TimeRange.YEAR
                ? [Math.round(elapsed / TimeRange.MONTH), "month"]
                : [Math.round(elapsed / TimeRange.YEAR), "year"];

  return `${value} ${pluralize(unit, value)} ago`;
};

export const getCompatibilityTags = (library: LibraryType): string[] => {
  const tags: string[] = [];
  if (library.dev) tags.push("Development Tool");
  if (library.template) tags.push("Template");
  if (!library.dev && !library.template && library.newArchitecture) tags.push("New Architecture");
  if (!library.dev && !library.template && !library.newArchitecture) tags.push("Old Architecture");
  if (library.expoGo) tags.push("Expo Go");
  return tags;
};

export const getSupportedPlatforms = (library: LibraryType): string[] => {
  const platforms: string[] = [];
  if (library.android) platforms.push("Android");
  if (library.ios) platforms.push("iOS");
  if (library.web) platforms.push("Web");
  if (library.windows) platforms.push("Windows");
  if (library.macos) platforms.push("macOS");
  if (library.tvos) platforms.push("tvOS");
  if (library.visionos) platforms.push("visionOS");
  if (library.vegaos) platforms.push("VegaOS");
  if (library.horizon) platforms.push("Horizon OS");
  return platforms;
};

export const getCompatibilityColor = (tag: string): Color => {
  return compatibilityColors[tag] || Color.SecondaryText;
};

export const getPlatformColor = (platform: string): Color => {
  return platformColors[platform] || Color.PrimaryText;
};

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return "0 B";
  }

  const dm = Math.max(0, decimals);
  const sizeRange = Math.floor(Math.log(bytes) / Math.log(MUL));
  const value = bytes / Math.pow(MUL, sizeRange);
  const formatted = parseFloat(value.toFixed(dm));

  return `${formatted} ${SUFFIXES[sizeRange]}`;
}

export const getPopularityLabel = (popularity?: number): { label: string; isHot: boolean } => {
  if (popularity === undefined) return { label: "N/A", isHot: false };
  const score = Math.round(popularity * 100);
  const isHot = popularity > 0.1;
  return { label: isHot ? `🔥 HOT (${score})` : `${score}`, isHot };
};

export const getModuleTypeLabel = (library: LibraryType): string[] => {
  const labels: string[] = [];
  const moduleType = library.github?.moduleType;

  if (moduleType === "expo") labels.push("Expo Module");
  if (moduleType === "turbo") labels.push("Turbo Module");
  if (moduleType === "nitro") labels.push("Nitro Module");

  return labels;
};

export const hasConfigPlugin = (library: LibraryType): boolean => {
  return !!(library.configPlugin || library.github?.configPlugin);
};

export const getModuleTypeColor = (label: string): Color => {
  return moduleTypeColors[label] || Color.SecondaryText;
};
