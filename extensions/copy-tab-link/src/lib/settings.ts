import { getPreferenceValues } from "@raycast/api";
import { CleanOptions, parseOptionalNumber, splitList, splitPatterns } from "./clean";
import { FormatContext, FormatId } from "./formats";
import { RichTextMethod } from "./richtext";

interface RawPreferences {
  browserSource?: string;
  preferredBrowser?: { name: string; path: string; bundleId?: string };
  richTextMethod?: string;
  richTextFallback?: string;
  plainFormat?: string;
  titleUrlSeparator?: string;
  customTemplate?: string;
  allTabsFormat?: string;
  allTabsPrefix?: string;
  stripTracking?: boolean;
  trackingParams?: string;
  removeFragment?: boolean;
  stripSiteSuffix?: boolean;
  titlePatterns?: string;
  stripEmoji?: boolean;
  maxTitleLength?: string;
  defaultAction?: string;
}

export interface Settings {
  browserSource: string;
  preferredBrowser?: string;
  richTextMethod: RichTextMethod;
  richTextFallback: FormatId;
  plainFormat: FormatId;
  allTabsFormat: FormatId;
  allTabsPrefix: "none" | "bullet" | "number";
  defaultAction: "copy" | "paste";
  clean: CleanOptions;
  format: FormatContext;
}

const FALLBACK_IDS: FormatId[] = ["url", "title", "titleUrl", "markdown"];
const PLAIN_IDS: FormatId[] = ["url", "title", "titleUrl", "titleUrlNewline"];
const ALL_TABS_IDS: FormatId[] = ["markdown", "url", "titleUrl", "html", "slack", "jira", "custom"];

function pick(value: string | undefined, allowed: FormatId[], fallback: FormatId): FormatId {
  return allowed.includes(value as FormatId) ? (value as FormatId) : fallback;
}

export function getSettings(): Settings {
  const raw = getPreferenceValues<RawPreferences>();

  return {
    browserSource: raw.browserSource ?? "auto",
    preferredBrowser: raw.preferredBrowser?.name,
    richTextMethod: raw.richTextMethod === "rtf" || raw.richTextMethod === "html" ? raw.richTextMethod : "auto",
    richTextFallback: pick(raw.richTextFallback, FALLBACK_IDS, "url"),
    plainFormat: pick(raw.plainFormat, PLAIN_IDS, "titleUrl"),
    allTabsFormat: pick(raw.allTabsFormat, ALL_TABS_IDS, "markdown"),
    allTabsPrefix: raw.allTabsPrefix === "none" || raw.allTabsPrefix === "number" ? raw.allTabsPrefix : "bullet",
    defaultAction: raw.defaultAction === "paste" ? "paste" : "copy",
    clean: {
      stripTracking: raw.stripTracking ?? true,
      trackingParams: splitList(raw.trackingParams),
      removeFragment: raw.removeFragment ?? false,
      stripSiteSuffix: raw.stripSiteSuffix ?? false,
      titlePatterns: splitPatterns(raw.titlePatterns),
      stripEmoji: raw.stripEmoji ?? false,
      maxTitleLength: parseOptionalNumber(raw.maxTitleLength),
    },
    format: {
      titleUrlSeparator: raw.titleUrlSeparator ?? " — ",
      customTemplate: raw.customTemplate?.trim() || "{title} — {url}",
    },
  };
}
