import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { buildImageName, commonPreferences, deleteCache, downloadPhoto, setWallpaper } from "../utils/common-utils";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";
import { Photo } from "pexels";
import { PexelsPhoto } from "../utils/types";

export function PhotosListItem(props: { pexelsPhoto: Photo; index: number }) {
  const { pexelsPhoto, index } = props;

  return (
    <List.Item
      id={index + "_" + pexelsPhoto.id}
      key={index + "_" + pexelsPhoto.id}
      icon={{ source: pexelsPhoto.src.tiny }}
      title={pexelsPhoto.photographer}
      accessories={[
        {
          icon: { source: "solid-circle.png", tintColor: (pexelsPhoto as PexelsPhoto).avg_color },
          tooltip: `${(pexelsPhoto as PexelsPhoto).avg_color}`,
        },
      ]}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`<img src="${pexelsPhoto.src.medium}" alt="${pexelsPhoto.photographer}" height="256" />\n

**${(pexelsPhoto as PexelsPhoto).alt.trim()}**`}
        />
      }
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Download}
            title={"Download Photo"}
            onAction={async () => {
              const { downloadSize } = commonPreferences();
              let url: string;
              switch (downloadSize) {
                case "tiny":
                  url = pexelsPhoto.src.tiny;
                  break;
                case "portrait":
                  url = pexelsPhoto.src.portrait;
                  break;
                case "landscape":
                  url = pexelsPhoto.src.landscape;
                  break;
                case "small":
                  url = pexelsPhoto.src.small;
                  break;
                case "medium":
                  url = pexelsPhoto.src.medium;
                  break;
                case "large":
                  url = pexelsPhoto.src.large;
                  break;
                case "large2x":
                  url = pexelsPhoto.src.large2x;
                  break;
                case "original":
                  url = pexelsPhoto.src.original;
                  break;
                default:
                  url = pexelsPhoto.src.original;
                  break;
              }
              const name = buildImageName(pexelsPhoto.src.original, downloadSize);
              await downloadPhoto(url, name);
            }}
          />
          <Action
            icon={Icon.Window}
            title={"Set Desktop Wallpaper"}
            onAction={() => {
              setWallpaper(pexelsPhoto.src.original).then(() => "");
            }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={"Copy Photo Link"}
              content={pexelsPhoto.url}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
            />
            <Action.CopyToClipboard
              title={"Copy Photo Color"}
              content={(pexelsPhoto as PexelsPhoto).avg_color}
              shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title={"Copy Photo Description"}
              content={(pexelsPhoto as PexelsPhoto).alt}
              shortcut={{ modifiers: ["ctrl", "cmd"], key: "." }}
            />
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
        </ActionPanel>
      }
    />
  );
}
