import { Action, ActionPanel, Detail, getPreferenceValues, Icon, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { BingImage, DownloadedBingImage } from "./types/types";
import fileUrl from "file-url";
import { buildBingImageURL, getPictureName } from "./utils/bing-wallpaper-utils";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { downloadPicture, setDownloadedWallpaper, setWallpaper } from "./utils/common-utils";
import { Preferences } from "./types/preferences";

export default function PreviewBingWallpaper(props: {
  isOnline: boolean;
  index: number;
  onlineImages: BingImage[];
  downloadedImage: DownloadedBingImage[];
}) {
  const { downloadSize } = getPreferenceValues<Preferences>();
  const { isOnline, index, onlineImages, downloadedImage } = props;
  const imagesLength = onlineImages.length + downloadedImage.length;
  const [pageIndex, setPageIndex] = useState<{ index: number; isOnline: boolean }>({
    index: isOnline ? index : index + onlineImages.length,
    isOnline: isOnline,
  });
  return (
    <Detail
      navigationTitle={
        pageIndex.isOnline
          ? onlineImages[pageIndex.index].title
          : downloadedImage[pageIndex.index - onlineImages.length].name
      }
      markdown={`<img src="${
        pageIndex.isOnline
          ? buildBingImageURL(onlineImages[pageIndex.index].url, "icon", 960, 540)
          : fileUrl(downloadedImage[pageIndex.index - onlineImages.length].path)
      }" alt="" height="400" />`}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ChevronDown}
            title={"Next"}
            shortcut={{ modifiers: ["cmd"], key: "pageDown" }}
            onAction={() => {
              if (pageIndex.index === imagesLength - 1) return;
              setPageIndex({ index: pageIndex.index + 1, isOnline: pageIndex.index + 1 < onlineImages.length });
            }}
          />
          <Action
            icon={Icon.ChevronUp}
            title={"Previous"}
            shortcut={{ modifiers: ["cmd"], key: "pageUp" }}
            onAction={() => {
              if (pageIndex.index === 0) return;
              setPageIndex({ index: pageIndex.index - 1, isOnline: pageIndex.index - 1 < onlineImages.length });
            }}
          />
          <Action
            icon={Icon.Desktop}
            title={"Set Desktop Wallpaper"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => {
              if (pageIndex.isOnline) {
                setWallpaper(
                  getPictureName(onlineImages[pageIndex.index].url),
                  buildBingImageURL(onlineImages[pageIndex.index].url, "raw")
                ).then(() => "");
              } else {
                setDownloadedWallpaper(downloadedImage[pageIndex.index - onlineImages.length].path).then(() => "");
              }
            }}
          />
          {pageIndex.isOnline && (
            <Action
              icon={Icon.Download}
              title={"Download Wallpaper"}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await downloadPicture(downloadSize, onlineImages[pageIndex.index]);
              }}
            />
          )}
          <Action
            icon={Icon.Circle}
            title={"Back"}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={useNavigation().pop}
          />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}
