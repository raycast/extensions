import React, { useState } from "react";
import { ResendWallpaperGrid } from "./components/resend-wallpaper-grid";
import { ResendWallpaperList } from "./components/resend-wallpaper-list";
import { getResendWallpaperList } from "./hooks/hooks";
import { layout } from "./types/preferences";

export default function SetResendWallpaper() {
  const [refresh, setRefresh] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<string>("0");
  const { resendWallpapers } = getResendWallpaperList(refresh);

  if (layout === "List") {
    return (
      <ResendWallpaperList
        resendWallpapers={resendWallpapers}
        setRefresh={setRefresh}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    );
  }

  return (
    <ResendWallpaperGrid
      resendWallpapers={resendWallpapers}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  );
}
