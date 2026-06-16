import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { downloadPicture, getWallpaperPreviewUrl } from "./utils/common-utils";
import { ArcaneWallpaperWithInfo } from "./types/types";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { setWallpaper } from "./utils/platform-utils";

export default function PreviewArcaneWallpaper(props: {
  index: number;
  arcaneWallpapers: ArcaneWallpaperWithInfo[];
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
  applyTo: string;
  picturesDirectory?: string;
}) {
  const { index, arcaneWallpapers, setSelectedItem, applyTo, picturesDirectory } = props;
  const imagesLength = arcaneWallpapers.length;
  const [pageIndex, setPageIndex] = useState<number>(index);
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={arcaneWallpapers[pageIndex].title}
      markdown={`<img src="${getWallpaperPreviewUrl(arcaneWallpapers[pageIndex])}" alt="" height="355" />`}
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
                setWallpaper(arcaneWallpapers[pageIndex], applyTo).then(() => "");
              }}
            />

            <Action
              icon={Icon.Download}
              title={"Download Wallpaper"}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await downloadPicture(arcaneWallpapers[pageIndex], picturesDirectory);
              }}
            />
          </ActionPanel.Section>
          <Action
            icon={Icon.Minimize}
            title={"Quit Preview"}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={pop}
          />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
