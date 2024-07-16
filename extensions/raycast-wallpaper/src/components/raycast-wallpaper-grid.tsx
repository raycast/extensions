import { getPreferenceValues, Grid, Icon } from "@raycast/api";
import React from "react";
import { RaycastWallpaperWithInfo } from "../types/types";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { Preferences } from "../types/preferences";
import { ActionOnRaycastWallpaper } from "./action-on-raycast-wallpaper";
import { getThumbnailUrl } from "../utils/common-utils";

export function RaycastWallpaperGrid(props: {
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  selectedItem: string;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { raycastWallpapers, setRefresh, selectedItem, setSelectedItem } = props;

  return (
    <Grid
      isLoading={raycastWallpapers.length === 0}
      columns={parseInt(preferences.columns)}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selectedItem);
        }
      }}
      searchBarPlaceholder={"Search wallpapers..."}
    >
      <RaycastWallpaperEmptyView layout={preferences.layout} />
      {raycastWallpapers.map((value, index) => {
        return (
          <Grid.Item
            id={index + ""}
            key={index + value.title}
            content={getThumbnailUrl(value.url)}
            title={value.title}
            actions={
              <ActionOnRaycastWallpaper
                index={index}
                raycastWallpapers={raycastWallpapers}
                setRefresh={setRefresh}
                setSelectedItem={setSelectedItem}
              />
            }
            accessory={value.exclude ? { icon: Icon.XMarkTopRightSquare, tooltip: "Excluded From Auto Switch" } : {}}
          />
        );
      })}
    </Grid>
  );
}
