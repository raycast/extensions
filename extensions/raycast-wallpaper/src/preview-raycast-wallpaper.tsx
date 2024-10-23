import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { downloadPicture, getThumbnailUrl } from "./utils/common-utils";
import { RaycastWallpaperWithInfo } from "./types/types";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { setWallpaper } from "./utils/applescript-utils";

export default function PreviewRaycastWallpaper(props: {
  index: number;
  raycastWallpapers: RaycastWallpaperWithInfo[];
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { index, raycastWallpapers, setSelectedItem } = props;
  const imagesLength = raycastWallpapers.length;
  const [pageIndex, setPageIndex] = useState<number>(index);
  return (
    <Detail
      navigationTitle={raycastWallpapers[pageIndex].title}
      markdown={`<img src="${getThumbnailUrl(raycastWallpapers[pageIndex].url)}" alt="" height="355" />`}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ChevronDown}
            title={"Next"}
            onAction={() => {
              if (pageIndex === imagesLength - 1) {
                setPageIndex(0);
                setSelectedItem("0");
              } else {
                setPageIndex(pageIndex + 1);
                setSelectedItem(`${pageIndex + 1}`);
              }
            }}
          />
          <Action
            icon={Icon.ChevronUp}
            title={"Previous"}
            onAction={() => {
              if (pageIndex === 0) {
                setPageIndex(imagesLength - 1);
                setSelectedItem(`${imagesLength - 1}`);
              } else {
                setPageIndex(pageIndex - 1);
                setSelectedItem(`${pageIndex - 1}`);
              }
            }}
          />
          <ActionPanel.Section>
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
          </ActionPanel.Section>
          <Action
            icon={Icon.Minimize}
            title={"Quit Preview"}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={useNavigation().pop}
          />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
