import React, { useState } from "react";
import { RaycastWallpaperList } from "./components/raycast-wallpaper-list";
import { getRaycastWallpaperList } from "./hooks/hooks";

import { RaycastWallpaperGrid } from "./components/raycast-wallpaper-grid";
import { layout } from "./types/preferences";

export default function SetRaycastWallpaper() {
  const [refresh, setRefresh] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<string>("0");
  const { raycastWallpapers } = getRaycastWallpaperList(refresh);

  return layout === "List" ? (
    <RaycastWallpaperList
      raycastWallpapers={raycastWallpapers}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  ) : (
    <RaycastWallpaperGrid
      raycastWallpapers={raycastWallpapers}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  );
}
