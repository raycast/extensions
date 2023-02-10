import { getPreferenceValues } from "@raycast/api";
import React from "react";
import { Preferences } from "./types/preferences";
import { autoDownloadWallpapers, getBingWallpapers } from "./hooks/hooks";
import { WallpaperListLayout } from "./components/wallpaper-list-layout";
import { WallpaperGridLayout } from "./components/wallpaper-grid-layout";

export default function CommonDirectory() {
  const preferences = getPreferenceValues<Preferences>();

  const { bingWallpaperHD, downloadedBingWallpapers, isLoading } = getBingWallpapers(
    preferences.includeDownloadedWallpapers
  );
  autoDownloadWallpapers(bingWallpaperHD);

  return preferences.layout === "List" ? (
    <WallpaperListLayout
      preferences={preferences}
      isLoading={isLoading}
      bingWallpaperHD={bingWallpaperHD}
      downloadedBingWallpapers={downloadedBingWallpapers}
    />
  ) : (
    <WallpaperGridLayout
      preferences={preferences}
      isLoading={isLoading}
      bingWallpaperHD={bingWallpaperHD}
      downloadedBingWallpapers={downloadedBingWallpapers}
    />
  );
}
