import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { buildIconCachePath, checkIconCache, deleteCache, downloadPicture, setWallpaper } from "../utils/common-utils";
import { RAYCAST_WALLPAPER } from "../utils/constants";
import React from "react";
import { RaycastWallpaper } from "../types/types";
import { ActionOpenPreferences } from "./action-open-preferences";
import { RaycastWallpaperEmptyView } from "./raycast-wallpaper-empty-view";
import { Preferences } from "../types/preferences";

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
      {raycastWallpapers.map((value, index, array) => {
        return (
          <Grid.Item
            id={index + ""}
            key={index + value.title}
            content={{ source: checkIconCache(value) ? buildIconCachePath(value) : value.url }}
            title={value.title}
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
    </Grid>
  );
}
