import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { downloadPicture, setWallpaper } from "./utils/common-utils";
import { RaycastWallpaper } from "./types/types";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function PreviewRaycastWallpaper(props: { index: number; raycastWallpapers: RaycastWallpaper[] }) {
  const { index, raycastWallpapers } = props;
  const imagesLength = raycastWallpapers.length;
  const [pageIndex, setPageIndex] = useState<number>(index);
  return (
    <Detail
      navigationTitle={raycastWallpapers[pageIndex].title}
      markdown={`<img src="${raycastWallpapers[pageIndex].url.replace(".png", "-preview.png")}" alt="" height="400" />`}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ChevronDown}
            title={"Next"}
            shortcut={{ modifiers: ["cmd"], key: "pageDown" }}
            onAction={() => {
              if (pageIndex === imagesLength - 1) return;
              setPageIndex(pageIndex + 1);
            }}
          />
          <Action
            icon={Icon.ChevronUp}
            title={"Previous"}
            shortcut={{ modifiers: ["cmd"], key: "pageUp" }}
            onAction={() => {
              if (pageIndex === 0) return;
              setPageIndex(pageIndex - 1);
            }}
          />
          <Action
            icon={Icon.Desktop}
            title={"Set Desktop Wallpaper"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => {
              setWallpaper(raycastWallpapers[pageIndex]).then(() => "");
            }}
          />

          <Action
            icon={Icon.Download}
            title={"Download Wallpaper"}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await downloadPicture(raycastWallpapers[pageIndex]);
            }}
          />
          <Action
            icon={Icon.Circle}
            title={"Back"}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={useNavigation().pop}
          />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
