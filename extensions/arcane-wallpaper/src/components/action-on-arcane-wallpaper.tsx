import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, open, showToast, Toast } from "@raycast/api";
import { cache, deleteCache, downloadPicture, getSavedDirectory } from "../utils/common-utils";
import PreviewArcaneWallpaper from "../preview-arcane-wallpaper";
import { CacheKey, ARCANE_WALLPAPER_HOME } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { ArcaneWallpaperWithInfo } from "../types/types";
import { setWallpaper } from "../utils/platform-utils";
import ActionStyle = Alert.ActionStyle;

export function ActionOnArcaneWallpaper(props: {
  index: number;
  arcaneWallpapers: ArcaneWallpaperWithInfo[];
  updateExcludeList: (excludeList: string[]) => void;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
  applyTo: string;
  picturesDirectory?: string;
}) {
  const { index, arcaneWallpapers, updateExcludeList, setSelectedItem, applyTo, picturesDirectory } = props;
  const wallpaper = arcaneWallpapers[index];

  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(wallpaper, applyTo).then(() => "");
        }}
      />
      <Action
        icon={Icon.Download}
        title={"Download Wallpaper"}
        onAction={async () => {
          await downloadPicture(wallpaper, picturesDirectory);
        }}
      />
      <Action
        icon={Icon.Finder}
        title={"Open Wallpaper Folder"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
        onAction={async () => {
          await open(getSavedDirectory(picturesDirectory));
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
            <PreviewArcaneWallpaper
              index={index}
              arcaneWallpapers={arcaneWallpapers}
              setSelectedItem={setSelectedItem}
              applyTo={applyTo}
              picturesDirectory={picturesDirectory}
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
            const includedWallpapers = arcaneWallpapers.filter((wallpaper) => !wallpaper.exclude);
            if (includedWallpapers.length === 0) {
              showToast(Toast.Style.Failure, "No included wallpapers");
              return;
            }
            const randomImage = includedWallpapers[Math.floor(Math.random() * includedWallpapers.length)];
            setWallpaper(randomImage, applyTo).then(() => "");
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
              if (!_excludeList.includes(wallpaper.url)) {
                _excludeList.push(wallpaper.url);
              }
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              updateExcludeList(_excludeList);
            }}
          />
        )}
        {wallpaper.exclude && (
          <Action
            icon={Icon.PlusTopRightSquare}
            title={"Include in Auto Switch"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
              const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
              const index = _excludeList.indexOf(wallpaper.url);
              if (index !== -1) {
                _excludeList.splice(index, 1);
              }
              cache.set(CacheKey.EXCLUDE_LIST_CACHE, JSON.stringify(_excludeList));
              updateExcludeList(_excludeList);
            }}
          />
        )}
        <Action.OpenInBrowser
          title={"Go to Arcane Wallpaper"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
          url={ARCANE_WALLPAPER_HOME}
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
