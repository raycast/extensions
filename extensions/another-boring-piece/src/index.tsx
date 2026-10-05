import {
  Action,
  ActionPanel,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { DownloadWallpaperAction, SetWallpaperAction } from "./actions";
import {
  API_TRIPLE_URL,
  buildWallpaperMarkdown,
  getThumbnailUrl,
  Wallpaper,
} from "./utils";

export default function Command() {
  const apiUrl = useMemo(() => `${API_TRIPLE_URL}?cacheBust=${Date.now()}`, []);
  const { isLoading, data } = useFetch<{
    today: Wallpaper;
    random: Wallpaper[];
  }>(apiUrl, {
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load wallpapers",
        message: error.message,
      });
    },
  });

  // Combine today's wallpaper with random ones
  const wallpapers = data ? [data.today, ...data.random] : [];

  return (
    <List isLoading={isLoading} isShowingDetail>
      {wallpapers?.map((wallpaper) => {
        return (
          <List.Item
            key={wallpaper.id}
            id={wallpaper.id}
            title={`${wallpaper.name} by ${wallpaper.artist}`}
            icon={{
              source: getThumbnailUrl(wallpaper.url, { width: 100 }),
              mask: Image.Mask.RoundedRectangle,
            }}
            detail={
              <List.Item.Detail markdown={buildWallpaperMarkdown(wallpaper)} />
            }
            actions={
              <ActionPanel>
                <SetWallpaperAction
                  wallpaper={wallpaper}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "w" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "w" },
                  }}
                />
                <ActionPanel.Section>
                  <DownloadWallpaperAction wallpaper={wallpaper} />
                  <Action
                    title="Learn More"
                    icon={Icon.Globe}
                    onAction={() =>
                      open(`https://anotherboring.day/art/${wallpaper.id}`)
                    }
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
