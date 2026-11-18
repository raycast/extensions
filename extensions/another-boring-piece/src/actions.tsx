import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { downloadWallpaper, setDesktopWallpaper, Wallpaper } from "./utils";

export function SetWallpaperAction(props: {
  wallpaper: Wallpaper;
  shortcut?: Keyboard.Shortcut;
}) {
  const { wallpaper, shortcut } = props;

  return (
    <Action
      title="Set Desktop Wallpaper"
      icon={Icon.Desktop}
      shortcut={shortcut}
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
  );
}

export function DownloadWallpaperAction(props: { wallpaper: Wallpaper }) {
  const { wallpaper } = props;

  return (
    <Action
      title="Download Wallpaper"
      icon={Icon.Download}
      shortcut={Keyboard.Shortcut.Common.Duplicate}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Downloading...",
        });
        try {
          const downloadPath = await downloadWallpaper(wallpaper);
          toast.style = Toast.Style.Success;
          toast.title = "Wallpaper downloaded";
          toast.message = `Saved to ${downloadPath}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download failed";
          toast.message =
            error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );
}
