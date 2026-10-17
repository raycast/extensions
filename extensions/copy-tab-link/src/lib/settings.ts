import { getPreferenceValues } from "@raycast/api";
import { CleanOptions, parseOptionalNumber, splitList, splitPatterns } from "./clean";
import { FormatContext, FormatId } from "./formats";
import { RichTextMethod } from "./richtext";

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

/**
 * Reads the manifest-generated preference type, so the shape here can never
 * drift away from `package.json`.
 */
export function getSettings(): Settings {
  const raw = getPreferenceValues<Preferences>();

  return {
    browserSource: raw.browserSource,
    preferredBrowser: raw.preferredBrowser?.name,
    richTextMethod: raw.richTextMethod,
    richTextFallback: raw.richTextFallback,
    plainFormat: raw.plainFormat,
    allTabsFormat: raw.allTabsFormat,
    allTabsPrefix: raw.allTabsPrefix,
    defaultAction: raw.defaultAction,
    clean: {
      stripTracking: raw.stripTracking,
      trackingParams: splitList(raw.trackingParams),
      removeFragment: raw.removeFragment,
      stripSiteSuffix: raw.stripSiteSuffix,
      titlePatterns: splitPatterns(raw.titlePatterns),
      stripEmoji: raw.stripEmoji,
      maxTitleLength: parseOptionalNumber(raw.maxTitleLength),
    },
    format: {
      titleUrlSeparator: raw.titleUrlSeparator,
      customTemplate: raw.customTemplate.trim() || "{title} — {url}",
    },
  };
}
