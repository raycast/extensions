import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  warpApp: "stable" | "preview";
}

const getWarpUri = (path: string) => {
  const { warpApp } = getPreferenceValues<Preferences>();
  const scheme = warpApp === "preview" ? "warppreview://" : "warp://";
  return `${scheme}${path}`;
};

export const getNewTabUri = (path: string) => getWarpUri(`action/new_tab?path=${encodeURIComponent(path)}`);
export const getNewWindowUri = (path: string) => getWarpUri(`action/new_window?path=${encodeURIComponent(path)}`);
export const getLaunchConfigUri = (path: string) => getWarpUri(`launch/${encodeURIComponent(path)}`);
