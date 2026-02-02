import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  open,
  Image,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  setDesktopWallpaper,
  downloadWallpaper,
  getThumbnailUrl,
  Wallpaper,
  API_TRIPLE_URL,
} from "./utils";

export default function Command() {
  const { isLoading, data } = useFetch<{
    today: Wallpaper;
    random: Wallpaper[];
  }>(API_TRIPLE_URL, {
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
        const imageUrl = getThumbnailUrl(wallpaper.url, { height: 280 });
        const markdown = `
<img src="${imageUrl}" alt="${wallpaper.name}" height="280" />

**${wallpaper.name}**

${wallpaper.artist}, ${wallpaper.creationDate}

${wallpaper.description || ""}
        `;

        return (
          <List.Item
            key={wallpaper.id}
            id={wallpaper.id}
            title={`${wallpaper.name} by ${wallpaper.artist}`}
            icon={{
              source: getThumbnailUrl(wallpaper.url, { width: 100 }),
              mask: Image.Mask.RoundedRectangle,
            }}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action
                  title="Set Desktop Wallpaper"
                  icon={Icon.Desktop}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Setting wallpaper...",
                    });
                    try {
                      await setDesktopWallpaper(wallpaper.url);
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
                        const path = await downloadWallpaper(
                          wallpaper.url,
                          wallpaper.name,
                        );
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
                    title="Learn More on Basalt"
                    icon={Icon.Globe}
                    onAction={() =>
                      open(
                        `https://basalt.yevgenglukhov.com/art/${wallpaper.id}`,
                      )
                    }
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
