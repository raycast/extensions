import { Icon, List } from "@raycast/api";
import type React from "react";
import { layout } from "../types/preferences";
import type { ResendWallpaperWithInfo } from "../types/types";
import { getThumbnailUrl } from "../utils/common-utils";
import { ActionOnResendWallpaper } from "./action-on-resend-wallpaper";
import { ResendWallpaperEmptyView } from "./resend-wallpaper-empty-view";

export function ResendWallpaperList(props: {
  resendWallpapers: ResendWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  selectedItem: string;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { resendWallpapers, setRefresh, selectedItem, setSelectedItem } = props;

  return (
    <List
      isShowingDetail={resendWallpapers.length !== 0}
      isLoading={resendWallpapers.length === 0}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selected);
        }
      }}
      searchBarPlaceholder={"Search wallpapers"}
    >
      <ResendWallpaperEmptyView layout={layout} />
      {resendWallpapers.map((value, index) => {
        return (
          <List.Item
            id={`${index}`}
            key={`${index}-${value.title}`}
            icon={{ source: getThumbnailUrl(value.url) }}
            title={value.title}
            accessories={
              value.exclude
                ? [
                    {
                      icon: Icon.XMarkTopRightSquare,
                      tooltip: "Excluded From Auto Switch",
                    },
                  ]
                : undefined
            }
            detail={<List.Item.Detail isLoading={false} markdown={`![](${getThumbnailUrl(value.url)})`} />}
            actions={
              <ActionOnResendWallpaper
                index={index}
                resendWallpapers={resendWallpapers}
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
