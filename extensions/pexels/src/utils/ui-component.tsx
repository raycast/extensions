import { Action, ActionPanel, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { PEXELS_URL } from "./costants";
import React from "react";
import { buildImageName, commonPreferences, deleteCache, downloadPhoto, setWallpaper } from "./common-utils";
import { Photo } from "pexels";

export function ActionToPexels() {
  return (
    <Action
      icon={Icon.Globe}
      title={"Go to Pexels"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
      onAction={async () => {
        await open(PEXELS_URL);
        await showHUD("View Pexels in Browser");
      }}
    />
  );
}

export function PhotosListItem(props: { pexelsPhoto: Photo; index: number }) {
  const { pexelsPhoto, index } = props;

  return (
    <List.Item
      id={index + "_" + pexelsPhoto.id}
      key={index + "_" + pexelsPhoto.id}
      icon={{ source: pexelsPhoto.src.tiny }}
      title={pexelsPhoto.photographer}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`<img src="${pexelsPhoto.src.medium}" alt="${pexelsPhoto.photographer}" height="256" />\n`}
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
