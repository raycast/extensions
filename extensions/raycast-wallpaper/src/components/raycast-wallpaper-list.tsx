import { getPreferenceValues, List } from "@raycast/api";
import React from "react";
import { RaycastWallpaper } from "../types/types";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { Preferences } from "../types/preferences";
import { ActionOnRaycastWallpaper } from "./action-on-raycast-wallpaper";
import { fixImage500Error } from "../utils/common-utils";

export function RaycastWallpaperList(props: { raycastWallpapers: RaycastWallpaper[] }) {
  const preferences = getPreferenceValues<Preferences>();
  const { raycastWallpapers } = props;

  return (
    <List
      isShowingDetail={raycastWallpapers.length !== 0}
      isLoading={raycastWallpapers.length === 0}
      searchBarPlaceholder={"Search pictures"}
    >
      <RaycastWallpaperEmptyView layout={preferences.layout} />
      {raycastWallpapers.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: fixImage500Error(value) }}
            title={value.title}
            detail={<List.Item.Detail isLoading={false} markdown={`![](${fixImage500Error(value)})`} />}
            actions={<ActionOnRaycastWallpaper index={index} raycastWallpapers={raycastWallpapers} />}
          />
        );
      })}
    </List>
  );
}
