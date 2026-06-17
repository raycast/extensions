import { Icon, List } from "@raycast/api";
import React from "react";
import { RaycastWallpaperWithInfo } from "../types/types";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { ActionOnRaycastWallpaper } from "./action-on-raycast-wallpaper";
import { getThumbnailUrl } from "../utils/common-utils";
import { layout } from "../types/preferences";

export function RaycastWallpaperList(props: {
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  selectedItem: string;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { raycastWallpapers, setRefresh, selectedItem, setSelectedItem } = props;

  return (
    <List
      isShowingDetail={raycastWallpapers.length !== 0}
      isLoading={raycastWallpapers.length === 0}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selectedItem);
        }
      }}
      searchBarPlaceholder={"Search wallpapers"}
    >
      <RaycastWallpaperEmptyView layout={layout} />
      {raycastWallpapers.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: getThumbnailUrl(value.url) }}
            title={value.title}
            accessories={
              value.exclude ? [{ icon: Icon.XMarkTopRightSquare, tooltip: "Excluded From Auto Switch" }] : undefined
            }
            detail={<List.Item.Detail isLoading={false} markdown={`![](${getThumbnailUrl(value.url)})`} />}
            actions={
              <ActionOnRaycastWallpaper
                index={index}
                raycastWallpapers={raycastWallpapers}
                setRefresh={setRefresh}
                setSelectedItem={setSelectedItem}
              />
            }
          />
        );
      })}
    </List>
  );
}
