import { Icon, List } from "@raycast/api";
import React from "react";
import { ArcaneWallpaperWithInfo } from "../types/types";
import { ArcaneWallpaperEmptyView } from "./arcane-wallpaper-empty-view";
import { ActionOnArcaneWallpaper } from "./action-on-arcane-wallpaper";
import { getWallpaperPreviewUrl } from "../utils/common-utils";
import { ALL_WALLPAPER_CATEGORIES } from "../utils/constants";

export function ArcaneWallpaperList(props: {
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
    applyTo,
    picturesDirectory,
  } = props;

  return (
    <List
      isShowingDetail={arcaneWallpapers.length !== 0}
      isLoading={isLoading}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selected);
        }
      }}
      searchBarPlaceholder={"Search wallpapers"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Wallpapers" value={selectedCategory} onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All" value={ALL_WALLPAPER_CATEGORIES} />
          {categories.map((category) => (
            <List.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </List.Dropdown>
      }
    >
      <ArcaneWallpaperEmptyView layout={layout} onRefresh={refreshCatalog} />
      {arcaneWallpapers.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: getWallpaperPreviewUrl(value) }}
            title={value.title}
            keywords={[value.category]}
            accessories={
              value.exclude ? [{ icon: Icon.XMarkTopRightSquare, tooltip: "Excluded From Auto Switch" }] : undefined
            }
            detail={<List.Item.Detail isLoading={false} markdown={`![](${getWallpaperPreviewUrl(value)})`} />}
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
          />
        );
      })}
    </List>
  );
}
