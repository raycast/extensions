import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { downloadSize } from "../types/preferences";
import { buildImageName, deleteCache, downloadPhoto, setOnlineWallpaper } from "../utils/common-utils";
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
          setOnlineWallpaper(item.photographer, item.src.original).then(() => "");
        }}
      />
      <ActionPanel.Submenu
        title={"Copy Info"}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
      >
        <Action.CopyToClipboard
          title={"Copy Photo Link"}
          content={item.url}
          shortcut={{ modifiers: ["shift", "cmd"], key: "1" }}
        />
        <Action.CopyToClipboard
          title={"Copy Photo Color"}
          content={(item as PexelsPhoto).avg_color}
          shortcut={{ modifiers: ["shift", "cmd"], key: "2" }}
        />
        <Action.CopyToClipboard
          title={"Copy Photo Description"}
          content={(item as PexelsPhoto).alt}
          shortcut={{ modifiers: ["shift", "cmd"], key: "3" }}
        />
        <Action.CopyToClipboard
          title={"Copy User Link"}
          content={item.photographer_url}
          shortcut={{ modifiers: ["shift", "cmd"], key: "4" }}
        />
        <Action.CopyToClipboard
          title={"Copy User Name"}
          content={item.photographer}
          shortcut={{ modifiers: ["shift", "cmd"], key: "5" }}
        />
      </ActionPanel.Submenu>

      <ActionPanel.Section>
        <ActionToPexels />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title={"Clear Cache"}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
          onAction={async () => {
            await showToast(Toast.Style.Success, "Clearing...");
            deleteCache();
            await showToast(Toast.Style.Success, "Cache is cleared.");
          }}
        />
      </ActionPanel.Section>

      <ActionOpenPreferences />
    </ActionPanel>
  );
}
