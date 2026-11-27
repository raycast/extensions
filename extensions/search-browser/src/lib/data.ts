import { Color, Icon, Image, environment, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { resolveLocalFaviconPath } from "./storage";
import { SpaceInfo } from "./types";

const SPACE_COLORS: Color[] = [
  Color.Blue,
  Color.Purple,
  Color.Magenta,
  Color.Red,
  Color.Orange,
  Color.Yellow,
  Color.Green,
  Color.SecondaryText,
];

export {
  flattenBookmarkNodes,
  getSearchProfileDirs,
  readBookmarks,
  readBrowserSettings,
  readHistory,
  readICloudFile,
  readLocalBrowserSnapshot,
  readPinnedTabs,
  readRemoteDeviceTabs,
  readSessionTabs,
  readSpaces,
  readTabsLocalSnapshot,
  resolveLocalFaviconPath,
} from "./storage";

export function getSpaceColor(spaceName: string, spaces: SpaceInfo[]): Color {
  const match = spaces.find((s) => s.name.toLowerCase() === spaceName.toLowerCase());
  const index = match ? match.colour : 0;
  return SPACE_COLORS[Math.abs(index) % SPACE_COLORS.length] ?? Color.Blue;
}

/**
 * Return an Image.ImageLike icon for a URL, preferring Search Browser's local favicon cache.
 * Only falls back to Raycast's online favicon service when the user opts in via preferences.
 */
export function getSiteIcon(url: string): Image.ImageLike {
  const localPath = resolveLocalFaviconPath(url, environment.appearance);
  if (localPath) {
    return { source: localPath, fallback: Icon.Globe };
  }
  const { fetchRemoteFavicons } = getPreferenceValues<Preferences>();
  if (fetchRemoteFavicons) {
    return getFavicon(url, { fallback: Icon.Globe });
  }
  return Icon.Globe;
}
