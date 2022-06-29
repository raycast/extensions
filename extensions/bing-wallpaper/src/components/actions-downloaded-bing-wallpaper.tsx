import { Action, ActionPanel, Icon, open, showHUD } from "@raycast/api";
import React from "react";
import { DownloadedBingImage } from "../types/types";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";
import { setDownloadedWallpaper } from "../utils/common-utils";

export function ActionsDownloadedBingWallpaper(props: {
  bingImage: DownloadedBingImage;
  bingImages: DownloadedBingImage[];
}) {
  const { bingImage, bingImages } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setDownloadedWallpaper(bingImage.path).then(() => "");
        }}
      />
      <Action.ShowInFinder path={bingImage.path} />
      <ActionPanel.Section>
        <Action
          icon={Icon.TwoArrowsClockwise}
          title={"Set Random Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            const randomImage = bingImages[Math.floor(Math.random() * bingImages.length)];
            setDownloadedWallpaper(randomImage.path).then(() => "");
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
