import React from "react";
import { RaycastWallpaperList } from "./components/raycast-wallpaper-list";
import { getRaycastWallpaperList } from "./hooks/hooks";

export default function CommonDirectory() {
  const { raycastWallpapers } = getRaycastWallpaperList();

  return <RaycastWallpaperList raycastWallpapers={raycastWallpapers} />;
}
