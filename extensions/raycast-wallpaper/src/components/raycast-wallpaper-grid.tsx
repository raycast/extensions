import { getPreferenceValues, Grid } from "@raycast/api";
import React from "react";
import { RaycastWallpaper } from "../types/types";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { Preferences } from "../types/preferences";
import { ActionOnRaycastWallpaper } from "./action-on-raycast-wallpaper";
import { fixImage500Error } from "../utils/common-utils";

export function RaycastWallpaperGrid(props: { raycastWallpapers: RaycastWallpaper[] }) {
  const preferences = getPreferenceValues<Preferences>();
  const { raycastWallpapers } = props;

  return (
    <Grid
      isLoading={raycastWallpapers.length === 0}
      itemSize={preferences.itemSize as Grid.ItemSize}
      searchBarPlaceholder={"Search pictures"}
    >
      <RaycastWallpaperEmptyView layout={preferences.layout} />
      {raycastWallpapers.map((value, index) => {
        return (
          <Grid.Item
            id={index + ""}
            key={index + value.title}
            content={fixImage500Error(value)}
            title={value.title}
            actions={<ActionOnRaycastWallpaper index={index} raycastWallpapers={raycastWallpapers} />}
          />
        );
      })}
    </Grid>
  );
}
