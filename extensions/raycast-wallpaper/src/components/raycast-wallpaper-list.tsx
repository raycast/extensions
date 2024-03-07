import { getPreferenceValues, Icon, List } from "@raycast/api";
import React from "react";
import { RaycastWallpaperWithInfo } from "../types/types";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { Preferences } from "../types/preferences";
import { ActionOnRaycastWallpaper } from "./action-on-raycast-wallpaper";
import { getPreviewUrl, getThumbnailUrl } from "../utils/common-utils";

export function RaycastWallpaperList(props: {
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { raycastWallpapers, setRefresh } = props;

  return (
    <List
      isShowingDetail={raycastWallpapers.length !== 0}
      isLoading={raycastWallpapers.length === 0}
      searchBarPlaceholder={"Search wallpapers"}
    >
      <RaycastWallpaperEmptyView layout={preferences.layout} />
      {raycastWallpapers.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: getThumbnailUrl(value.url) }}
            title={value.title}
            accessories={
              value.exclude ? [{ icon: Icon.XMarkTopRightSquare, tooltip: "Excluded From Auto Switch" }] : []
            }
            detail={<List.Item.Detail isLoading={false} markdown={`![](${getPreviewUrl(value.url)})`} />}
            actions={
              <ActionOnRaycastWallpaper index={index} raycastWallpapers={raycastWallpapers} setRefresh={setRefresh} />
            }
          />
        );
      })}
    </List>
  );
}
