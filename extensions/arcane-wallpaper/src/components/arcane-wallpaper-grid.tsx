import { Color, Grid, Icon } from "@raycast/api";
import React from "react";
import { ArcaneWallpaperWithInfo } from "../types/types";
import { ArcaneWallpaperEmptyView } from "./arcane-wallpaper-empty-view";
import { ActionOnArcaneWallpaper } from "./action-on-arcane-wallpaper";
import { getWallpaperPreviewUrl } from "../utils/common-utils";
import { ALL_WALLPAPER_CATEGORIES } from "../utils/constants";

export function ArcaneWallpaperGrid(props: {
  arcaneWallpapers: ArcaneWallpaperWithInfo[];
  categories: string[];
  isLoading: boolean;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  refreshCatalog: () => void;
  updateExcludeList: (excludeList: string[]) => void;
  selectedItem: string;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
  layout: string;
  columns: string;
  applyTo: string;
  picturesDirectory?: string;
}) {
  const {
    arcaneWallpapers,
    categories,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    refreshCatalog,
    updateExcludeList,
    selectedItem,
    setSelectedItem,
    layout,
    columns,
    applyTo,
    picturesDirectory,
  } = props;

  return (
    <Grid
      isLoading={isLoading}
      columns={parseInt(columns ?? "4")}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selected);
        }
      }}
      searchBarPlaceholder={"Search wallpapers..."}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter Wallpapers" value={selectedCategory} onChange={setSelectedCategory}>
          <Grid.Dropdown.Item title="All" value={ALL_WALLPAPER_CATEGORIES} />
          {categories.map((category) => (
            <Grid.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </Grid.Dropdown>
      }
    >
      <ArcaneWallpaperEmptyView layout={layout} onRefresh={refreshCatalog} />
      {arcaneWallpapers.map((value, index) => {
        return (
          <Grid.Item
            id={index + ""}
            key={index + value.title}
            content={getWallpaperPreviewUrl(value)}
            title={value.title}
            keywords={[value.category]}
            actions={
              <ActionOnArcaneWallpaper
                index={index}
                arcaneWallpapers={arcaneWallpapers}
                updateExcludeList={updateExcludeList}
                setSelectedItem={setSelectedItem}
                applyTo={applyTo}
                picturesDirectory={picturesDirectory}
              />
            }
            accessory={
              value.exclude
                ? {
                    icon: { source: Icon.XMarkTopRightSquare, tintColor: Color.SecondaryText },
                    tooltip: "Excluded From Auto Switch",
                  }
                : undefined
            }
          />
        );
      })}
    </Grid>
  );
}
