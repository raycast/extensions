import { Icon } from "@raycast/api";
import { URI_SCHEME_ICONS } from "~/constants/icons";

/** Returns an icon for the given URI based on its scheme, falling back to Globe. */
export function uriSchemeIcon(uri: string): Icon {
  try {
    const scheme = new URL(uri).protocol; // e.g. "https:"
    return URI_SCHEME_ICONS[scheme] ?? Icon.Globe;
  } catch {
    return Icon.Globe;
  }
}
