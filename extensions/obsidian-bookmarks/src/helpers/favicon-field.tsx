import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

export const DEFAULT_FAVICON_FIELD = "favicon";

/**
 * The frontmatter field holding a bookmark's favicon override. Falls back to
 * "favicon" when the preference is blank — or missing entirely, which is what
 * happens for installations that predate the preference.
 */
export default function getFaviconField(): string {
  return getPreferenceValues<Preferences>().faviconField?.trim() || DEFAULT_FAVICON_FIELD;
}
