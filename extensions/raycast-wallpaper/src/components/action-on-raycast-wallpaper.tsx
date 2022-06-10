import { Action, ActionPanel, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { deleteCache, downloadPicture, setWallpaper } from "../utils/common-utils";
import PreviewRaycastWallpaper from "../preview-raycast-wallpaper";
import { RAYCAST_WALLPAPER } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { RaycastWallpaper } from "../types/types";

export function ActionOnRaycastWallpaper(props: { index: number; raycastWallpapers: RaycastWallpaper[] }) {
  const { index, raycastWallpapers } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(raycastWallpapers[index]).then(() => "");
        }}
      />
      <Action
        icon={Icon.Download}
        title={"Download Picture"}
        onAction={async () => {
          await downloadPicture(raycastWallpapers[index]);
        }}
      />
      <Action.Push
        icon={Icon.Sidebar}
        title={"Preview Wallpaper"}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        target={<PreviewRaycastWallpaper index={index} raycastWallpapers={raycastWallpapers} />}
      />

      <ActionPanel.Section>
        <Action
          icon={Icon.TwoArrowsClockwise}
          title={"Set Random Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            const randomImage = raycastWallpapers[Math.floor(Math.random() * raycastWallpapers.length)];
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
          title={"Clear Picture Cache"}
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
  );
}
