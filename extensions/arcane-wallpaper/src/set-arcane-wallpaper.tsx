import React, { useState } from "react";
import { ArcaneWallpaperList } from "./components/arcane-wallpaper-list";
import { useArcaneWallpaperList } from "./hooks/hooks";

import { ArcaneWallpaperGrid } from "./components/arcane-wallpaper-grid";
import { getSetArcaneWallpaperPreferences } from "./types/preferences";
import { ALL_WALLPAPER_CATEGORIES } from "./utils/constants";

export default function SetArcaneWallpaper() {
  const [refresh, setRefresh] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<string>("0");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_WALLPAPER_CATEGORIES);
  const { arcaneWallpapers, isLoading, updateExcludeList } = useArcaneWallpaperList(refresh);
  const preferences = getSetArcaneWallpaperPreferences();
  const layout = preferences.layout ?? "Grid";
  const columns = preferences.columns ?? "4";
  const applyTo = preferences.applyTo ?? "every";
  const picturesDirectory = preferences.picturesDirectory;
  const categories = Array.from(new Set(arcaneWallpapers.map((wallpaper) => wallpaper.category))).sort();
  const filteredWallpapers =
    selectedCategory === ALL_WALLPAPER_CATEGORIES
      ? arcaneWallpapers
      : arcaneWallpapers.filter((wallpaper) => wallpaper.category === selectedCategory);

  return layout === "List" ? (
    <ArcaneWallpaperList
      arcaneWallpapers={filteredWallpapers}
      categories={categories}
      isLoading={isLoading}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      refreshCatalog={() => setRefresh(Date.now())}
      updateExcludeList={updateExcludeList}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      layout={layout}
      applyTo={applyTo}
      picturesDirectory={picturesDirectory}
    />
  ) : (
    <ArcaneWallpaperGrid
      arcaneWallpapers={filteredWallpapers}
      categories={categories}
      isLoading={isLoading}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      refreshCatalog={() => setRefresh(Date.now())}
      updateExcludeList={updateExcludeList}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      layout={layout}
      columns={columns}
      applyTo={applyTo}
      picturesDirectory={picturesDirectory}
    />
  );
}
