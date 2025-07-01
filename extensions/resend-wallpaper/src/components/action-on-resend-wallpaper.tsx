import { Action, ActionPanel, Alert, Clipboard, Icon, Toast, confirmAlert, open, showToast } from "@raycast/api";
import type React from "react";
import PreviewResendWallpaper from "../preview-resend-wallpaper";
import { picturesDirectory } from "../types/preferences";
import type { AppearancedWallpaper, ResendWallpaperWithInfo } from "../types/types";
import { setWallpaper } from "../utils/applescript-utils";
import { cache, deleteCache, downloadPicture } from "../utils/common-utils";
import { CacheKey, RESEND_WALLPAPER } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import ActionStyle = Alert.ActionStyle;

export function ActionOnResendWallpaper(props: {
  index: number;
  resendWallpapers: ResendWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { index, resendWallpapers, setRefresh, setSelectedItem } = props;
  const wallpaper = resendWallpapers[index];

  const actionAppearanceIcon = wallpaper.appearance === "light" ? Icon.Sun : Icon.Moon;
  const actionAppearanceTitle = wallpaper.appearance === "light" ? "Dark" : "Light";

  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(wallpaper).then(() => "");
        }}
      />
      <Action
        icon={Icon.Download}
        title={"Download Wallpaper"}
        onAction={async () => {
          await downloadPicture(wallpaper);
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
            await Clipboard.copy(wallpaper.url);
            await showToast(Toast.Style.Success, "Copied URL to clipboard!");
          }}
        />
        <Action.Push
          icon={Icon.Maximize}
          title={"Preview Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          target={
            <PreviewResendWallpaper
              index={index}
              resendWallpapers={resendWallpapers}
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
            const randomImage = resendWallpapers[Math.floor(Math.random() * resendWallpapers.length)];
            setWallpaper(randomImage).then(() => "");
          }}
        />

        <Action
          icon={actionAppearanceIcon}
          title={`Set to ${actionAppearanceTitle}`}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => {
            const wallpaperAppearance: AppearancedWallpaper = {
              title: wallpaper.title,
              appearance: wallpaper.appearance === "light" ? "dark" : "light",
            };
            const _appearanceCache = cache.get(CacheKey.WALLPAPER_APPEARANCE);
            const wallpapersList =
              typeof _appearanceCache === "undefined" ? [] : (JSON.parse(_appearanceCache) as AppearancedWallpaper[]);
            const _appearanceIndex = wallpapersList.findIndex((value) => value.title === wallpaper.title);
            if (_appearanceIndex !== -1) {
              wallpapersList.splice(_appearanceIndex, 1);
            }
            wallpapersList.push(wallpaperAppearance);
            cache.set(CacheKey.WALLPAPER_APPEARANCE, JSON.stringify(wallpapersList));
            setRefresh(Date.now());
          }}
        />
        {!wallpaper.exclude && (
          <Action
            icon={Icon.XMarkTopRightSquare}
            title={"Exclude from Auto Switch"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.push(wallpaper.url);
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              setRefresh(Date.now());
            }}
          />
        )}
        {wallpaper.exclude && (
          <Action
            icon={Icon.PlusTopRightSquare}
            title={"Include in Auto Switch"}
            shortcut={{ modifiers: ["ctrl"], key: "i" }}
            onAction={() => {
              const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              _excludeList.splice(_excludeList.indexOf(wallpaper.url), 1);
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              setRefresh(Date.now());
            }}
          />
        )}
        <Action.OpenInBrowser
          title={"Go to Resend Wallpaper"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
          url={RESEND_WALLPAPER}
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
