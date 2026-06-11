import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  open,
  Image,
  Keyboard,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import {
  buildWallpaperMarkdown,
  setDesktopWallpaper,
  downloadWallpaper,
  getThumbnailUrl,
  Wallpaper,
  API_TRIPLE_URL,
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
                <Action
                  title="Set Desktop Wallpaper"
                  icon={Icon.Desktop}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Setting wallpaper...",
                    });
                    try {
                      await setDesktopWallpaper(wallpaper);
                      toast.style = Toast.Style.Success;
                      toast.title = "Wallpaper set successfully";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to set wallpaper";
                      toast.message =
                        error instanceof Error ? error.message : String(error);
                    }
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Download Wallpaper"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Downloading...",
                      });
                      try {
                        const path = await downloadWallpaper(wallpaper);
                        toast.style = Toast.Style.Success;
                        toast.title = "Wallpaper downloaded";
                        toast.message = `Saved to ${path}`;
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Download failed";
                        toast.message =
                          error instanceof Error
                            ? error.message
                            : String(error);
                      }
                    }}
                  />
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
