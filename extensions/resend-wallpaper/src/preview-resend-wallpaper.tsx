import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import type React from "react";
import { useState } from "react";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import type { ResendWallpaperWithInfo } from "./types/types";
import { setWallpaper } from "./utils/applescript-utils";
import { downloadPicture, getThumbnailUrl } from "./utils/common-utils";

export default function PreviewResendWallpaper(props: {
  index: number;
  resendWallpapers: ResendWallpaperWithInfo[];
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { index, resendWallpapers, setSelectedItem } = props;
  const imagesLength = resendWallpapers.length;
  const [pageIndex, setPageIndex] = useState<number>(index);

  return (
    <Detail
      navigationTitle={resendWallpapers[pageIndex].title}
      markdown={`<img src="${getThumbnailUrl(resendWallpapers[pageIndex].url)}" alt="" height="355" />`}
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
                setWallpaper(resendWallpapers[pageIndex]);
              }}
            />

            <Action
              icon={Icon.Download}
              title={"Download Wallpaper"}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await downloadPicture(resendWallpapers[pageIndex]);
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
