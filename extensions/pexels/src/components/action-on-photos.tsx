import { Action, ActionPanel, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import React from "react";
import { Preferences } from "../types/preferences";
import { buildImageName, deleteCache, downloadPhoto, setWallpaper } from "../utils/common-utils";
import { PexelsPhoto } from "../types/types";
import { ActionToPexels } from "./action-to-pexels";
import { Photo } from "pexels";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ActionOnPhotos(props: { item: Photo }) {
  const { item } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Download}
        title={"Download Photo"}
        onAction={async () => {
          const { downloadSize } = getPreferenceValues<Preferences>();
          let url: string;
          switch (downloadSize) {
            case "tiny":
              url = item.src.tiny;
              break;
            case "portrait":
              url = item.src.portrait;
              break;
            case "landscape":
              url = item.src.landscape;
              break;
            case "small":
              url = item.src.small;
              break;
            case "medium":
              url = item.src.medium;
              break;
            case "large":
              url = item.src.large;
              break;
            case "large2x":
              url = item.src.large2x;
              break;
            case "original":
              url = item.src.original;
              break;
            default:
              url = item.src.original;
              break;
          }
          const name = buildImageName(item.src.original, downloadSize);
          await downloadPhoto(url, name);
        }}
      />
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(item.src.original).then(() => "");
        }}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Photo Link"}
          content={item.url}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        />
        <Action.CopyToClipboard
          title={"Copy Photo Color"}
          content={(item as PexelsPhoto).avg_color}
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title={"Copy Photo Description"}
          content={(item as PexelsPhoto).alt}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "." }}
        />
        <Action.CopyToClipboard title={"Copy User Link"} content={item.photographer_url} />
        <Action.CopyToClipboard title={"Copy User Name"} content={item.photographer} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionToPexels />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Globe}
          title={"Clear Cache"}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
          onAction={async () => {
            await showToast(Toast.Style.Success, "Clearing...");
            await deleteCache();
            await showToast(Toast.Style.Success, "Cache is cleared.");
          }}
        />
      </ActionPanel.Section>

      <ActionOpenPreferences />
    </ActionPanel>
  );
}
