import { Action, ActionPanel, Icon, open, showHUD } from "@raycast/api";
import React from "react";
import { BingImage, DownloadedBingImage } from "../types/types";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";
import { setLocalWallpaper } from "../utils/common-utils";
import PreviewBingWallpaper from "../preview-bing-wallpaper";
import { downloadDirectory } from "../types/preferences";

export function ActionsDownloadedBingWallpaper(props: {
  index: number;
  bingImage: DownloadedBingImage;
  onlineImages: BingImage[];
  downloadedImages: DownloadedBingImage[];
}) {
  const { index, bingImage, onlineImages, downloadedImages } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setLocalWallpaper(bingImage.path).then(() => "");
        }}
      />
      <Action.ShowInFinder path={bingImage.path} />

      <Action.Push
        icon={Icon.Sidebar}
        title={"Preview Wallpaper"}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        target={
          <PreviewBingWallpaper
            isOnline={false}
            index={index}
            onlineImages={onlineImages}
            downloadedImage={downloadedImages}
          />
        }
      />
      <Action
        icon={Icon.Finder}
        title={"Open Wallpaper Folder"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
        onAction={async () => {
          await open(downloadDirectory);
        }}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          title={"Set Random Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            const randomImage = downloadedImages[Math.floor(Math.random() * downloadedImages.length)];
            setLocalWallpaper(randomImage.path).then(() => "");
          }}
        />
        <Action
          icon={Icon.Globe}
          title={"More Bing Wallpaper"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
          onAction={async () => {
            await open("https://github.com/niumoo/bing-wallpaper");
            await showHUD("Get more bing wallpaper");
          }}
        />
      </ActionPanel.Section>
      <ActionOpenExtensionPreferences />
    </ActionPanel>
  );
}
