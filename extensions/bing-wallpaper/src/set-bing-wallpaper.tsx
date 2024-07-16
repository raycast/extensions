import React from "react";
import { includeDownloadedWallpapers, layout } from "./types/preferences";
import { autoDownloadWallpapers, getBingWallpapers } from "./hooks/hooks";
import { WallpaperListLayout } from "./components/wallpaper-list-layout";
import { WallpaperGridLayout } from "./components/wallpaper-grid-layout";

export default function CommonDirectory() {
  const { bingWallpaperHD, downloadedBingWallpapers, isLoading } = getBingWallpapers(includeDownloadedWallpapers);
  autoDownloadWallpapers(bingWallpaperHD);

  return layout === "List" ? (
    <WallpaperListLayout
      isLoading={isLoading}
      bingWallpaperHD={bingWallpaperHD}
      downloadedBingWallpapers={downloadedBingWallpapers}
    />
  ) : (
    <WallpaperGridLayout
      isLoading={isLoading}
      bingWallpaperHD={bingWallpaperHD}
      downloadedBingWallpapers={downloadedBingWallpapers}
    />
  );
}
