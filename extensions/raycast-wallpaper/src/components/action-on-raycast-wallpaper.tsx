import { Action, ActionPanel, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { cache, deleteCache, downloadPicture, setWallpaper } from "../utils/common-utils";
import PreviewRaycastWallpaper from "../preview-raycast-wallpaper";
import { LocalStorageKey, RAYCAST_WALLPAPER } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { RaycastWallpaperWithInfo } from "../types/types";

export function ActionOnRaycastWallpaper(props: {
  index: number;
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { index, raycastWallpapers, setRefresh } = props;
  const raycastWallpaper = raycastWallpapers[index];
  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(raycastWallpaper).then(() => "");
        }}
      />
      <Action
        icon={Icon.Download}
        title={"Download Wallpaper"}
        onAction={async () => {
          await downloadPicture(raycastWallpaper);
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
          icon={Icon.ArrowClockwise}
          title={"Set Random Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            const randomImage = raycastWallpapers[Math.floor(Math.random() * raycastWallpapers.length)];
            setWallpaper(randomImage).then(() => "");
          }}
        />
        {!raycastWallpaper.exclude && (
          <Action
            icon={Icon.XMarkTopRightSquare}
            title={"Exclude From Auto Switch"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
            onAction={() => {
              const _excludeCache = cache.get(LocalStorageKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.push(raycastWallpaper.url);
              cache.set(LocalStorageKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              setRefresh(Date.now());
            }}
          />
        )}
        {raycastWallpaper.exclude && (
          <Action
            icon={Icon.PlusTopRightSquare}
            title={"Include in Auto Switch"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
            onAction={() => {
              const _excludeCache = cache.get(LocalStorageKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.splice(_excludeList.indexOf(raycastWallpaper.url), 1);
              cache.set(LocalStorageKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              setRefresh(Date.now());
            }}
          />
        )}
        <Action.OpenInBrowser
          title={"Go to Raycast Wallpaper"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
          url={RAYCAST_WALLPAPER}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
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
