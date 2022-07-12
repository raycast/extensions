import { Action, ActionPanel, Icon, open, showHUD } from "@raycast/api";
import { downloadPicture, setWallpaper } from "../utils/common-utils";
import { buildBingImageURL, buildCopyrightURL, getPictureName } from "../utils/bing-wallpaper-utils";
import React from "react";
import { BingImage, DownloadedBingImage } from "../types/types";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";
import PreviewBingWallpaper from "../preview-bing-wallpaper";

export function ActionsOnlineBingWallpaper(props: {
  index: number;
  bingImage: BingImage;
  onlineImages: BingImage[];
  downloadedImages: DownloadedBingImage[];
  downloadSize: string;
}) {
  const { index, bingImage, downloadSize, onlineImages, downloadedImages } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(
            getPictureName(bingImage.url) + "-" + bingImage.startdate,
            buildBingImageURL(bingImage.url, "raw")
          ).then(() => "");
        }}
      />
      <Action
        icon={Icon.Download}
        title={"Download Wallpaper"}
        onAction={async () => {
          await downloadPicture(downloadSize, bingImage);
        }}
      />
      <Action.Push
        icon={Icon.Sidebar}
        title={"Preview Wallpaper"}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        target={
          <PreviewBingWallpaper
            isOnline={true}
            index={index}
            onlineImages={onlineImages}
            downloadedImage={downloadedImages}
          />
        }
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.TwoArrowsClockwise}
          title={"Set Random Wallpaper"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            const randomImage = onlineImages[Math.floor(Math.random() * onlineImages.length)];
            setWallpaper(
              getPictureName(randomImage.url) + "-" + randomImage.startdate,
              buildBingImageURL(randomImage.url, "raw")
            ).then(() => "");
          }}
        />
        <Action
          icon={Icon.MagnifyingGlass}
          title={"Search Wallpaper"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          onAction={async () => {
            await open(buildCopyrightURL(bingImage.copyrightlink));
            await showHUD("Search picture in browser");
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
