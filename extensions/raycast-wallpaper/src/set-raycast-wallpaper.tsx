import React from "react";
import { RaycastWallpaperList } from "./components/raycast-wallpaper-list";
import { getRaycastWallpaperList } from "./hooks/hooks";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { RaycastWallpaperGrid } from "./components/raycast-wallpaper-grid";

export default function SetRaycastWallpaper() {
  const { raycastWallpapers } = getRaycastWallpaperList();
  const { layout } = getPreferenceValues<Preferences>();

  return layout === "List" ? (
    <RaycastWallpaperList raycastWallpapers={raycastWallpapers} />
  ) : (
    <RaycastWallpaperGrid raycastWallpapers={raycastWallpapers} />
  );
}
