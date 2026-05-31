import React, { useState } from "react";
import { ArcaneWallpaperList } from "./components/arcane-wallpaper-list";
import { getArcaneWallpaperList } from "./hooks/hooks";

import { ArcaneWallpaperGrid } from "./components/arcane-wallpaper-grid";
import { layout } from "./types/preferences";
import { ALL_WALLPAPER_CATEGORIES } from "./utils/constants";

export default function SetArcaneWallpaper() {
  const [refresh, setRefresh] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<string>("0");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_WALLPAPER_CATEGORIES);
  const { arcaneWallpapers } = getArcaneWallpaperList(refresh);
  const categories = Array.from(new Set(arcaneWallpapers.map((wallpaper) => wallpaper.category))).sort();
  const filteredWallpapers =
    selectedCategory === ALL_WALLPAPER_CATEGORIES
      ? arcaneWallpapers
      : arcaneWallpapers.filter((wallpaper) => wallpaper.category === selectedCategory);

  return layout === "List" ? (
    <ArcaneWallpaperList
      arcaneWallpapers={filteredWallpapers}
      categories={categories}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  ) : (
    <ArcaneWallpaperGrid
      arcaneWallpapers={filteredWallpapers}
      categories={categories}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      setRefresh={setRefresh}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
    />
  );
}
