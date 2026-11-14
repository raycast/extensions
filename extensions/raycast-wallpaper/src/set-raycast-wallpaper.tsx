import React, { useState } from "react";
import { RaycastWallpaperList } from "./components/raycast-wallpaper-list";
import { useRaycastWallpaperList } from "./hooks/hooks";

import { RaycastWallpaperGrid } from "./components/raycast-wallpaper-grid";
import { layout } from "./types/preferences";

export default function SetRaycastWallpaper() {
  const [refresh, setRefresh] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<string>("0");
  const { raycastWallpapers, isLoading } = useRaycastWallpaperList(refresh);

  return layout === "List" ? (
    <RaycastWallpaperList
      raycastWallpapers={raycastWallpapers}
      isLoading={isLoading}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  ) : (
    <RaycastWallpaperGrid
      raycastWallpapers={raycastWallpapers}
      isLoading={isLoading}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  );
}
