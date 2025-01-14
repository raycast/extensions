import { Action, ActionPanel, Clipboard, Alert, confirmAlert, Icon, showToast, Toast, open } from "@raycast/api";
import { cache, deleteCache, downloadPicture } from "../utils/common-utils";
import PreviewRaycastWallpaper from "../preview-raycast-wallpaper";
import { CacheKey, RAYCAST_WALLPAPER } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { RaycastWallpaperWithInfo } from "../types/types";
import { setWallpaper } from "../utils/applescript-utils";
import ActionStyle = Alert.ActionStyle;
import { picturesDirectory } from "../types/preferences";

export function ActionOnRaycastWallpaper(props: {
  index: number;
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { index, raycastWallpapers, setRefresh, setSelectedItem } = props;
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
      <Action
        icon={Icon.Finder}
        title={"Open Wallpaper Folder"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
        onAction={async () => {
          await open(picturesDirectory);
        }}
      />

      <ActionPanel.Section>
        <Action
          icon={Icon.Clipboard}
          title={"Copy Wallpaper URL"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(raycastWallpaper.url);
            await showToast(Toast.Style.Success, "Copied URL to clipboard!");
          }}
        />
        <Action.Push
          icon={Icon.Maximize}
          title={"Preview Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          target={
            <PreviewRaycastWallpaper
              index={index}
              raycastWallpapers={raycastWallpapers}
              setSelectedItem={setSelectedItem}
            />
          }
          onPush={() => setSelectedItem(index.toString())}
        />
      </ActionPanel.Section>

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
            title={"Exclude from Auto Switch"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.push(raycastWallpaper.url);
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              setRefresh(Date.now());
            }}
          />
        )}
        {raycastWallpaper.exclude && (
          <Action
            icon={Icon.PlusTopRightSquare}
            title={"Include in Auto Switch"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.splice(_excludeList.indexOf(raycastWallpaper.url), 1);
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
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
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
          onAction={async () => {
            const options: Alert.Options = {
              icon: Icon.Trash,
              title: "Clear Picture Cache",
              message: "Next time you enter the command, the pictures will be re-cached.",
              primaryAction: {
                title: "Confirm",
                style: ActionStyle.Destructive,
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
