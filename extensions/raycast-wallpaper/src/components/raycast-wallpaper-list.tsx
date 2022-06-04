import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import {
  buildCachePath,
  buildIconCachePath,
  checkCache,
  checkIconCache,
  deleteCache,
  downloadPicture,
  setWallpaper,
} from "../utils/common-utils";
import fileUrl from "file-url";
import { RAYCAST_WALLPAPER } from "../utils/constants";
import React from "react";
import { RaycastWallpaper } from "../types/types";
import { ActionOpenPreferences } from "./action-open-preferences";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";

export function RaycastWallpaperList(props: { raycastWallpapers: RaycastWallpaper[] }) {
  const { raycastWallpapers } = props;

  return (
    <List
      isShowingDetail={raycastWallpapers.length !== 0}
      isLoading={raycastWallpapers.length === 0}
      searchBarPlaceholder={"Search pictures"}
    >
      <RaycastWallpaperEmptyView />
      {raycastWallpapers.map((value, index, array) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: checkIconCache(value) ? buildIconCachePath(value) : value.url }}
            title={value.title}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`![](${checkCache(value) ? fileUrl(buildCachePath(value)) : value.url})`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Desktop}
                  title={"Set Desktop Wallpaper"}
                  onAction={() => {
                    setWallpaper(value).then(() => "");
                  }}
                />
                <Action
                  icon={Icon.Download}
                  title={"Download Picture"}
                  onAction={async () => {
                    await downloadPicture(value);
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.TwoArrowsClockwise}
                    title={"Set Random Wallpaper"}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      const randomImage = array[Math.floor(Math.random() * array.length)];
                      setWallpaper(randomImage).then(() => "");
                    }}
                  />
                  <Action.OpenInBrowser
                    title={"Go to Raycast Wallpaper"}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
                    url={RAYCAST_WALLPAPER}
                  />
                  <Action
                    icon={Icon.Trash}
                    title={"Clear Pictures Cache"}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                    onAction={async () => {
                      const options: Alert.Options = {
                        icon: Icon.Trash,
                        title: "Are you sure?",
                        message: "Next time you enter the command, the pictures will be re-cached.",
                        primaryAction: {
                          title: "Confirm",
                          onAction: () => {
                            deleteCache();
                            showToast(Toast.Style.Success, "Clear cache success!");
                          },
                        },
                      };
                      await confirmAlert(options);
                    }}
                  />
                </ActionPanel.Section>

                <ActionOpenPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
