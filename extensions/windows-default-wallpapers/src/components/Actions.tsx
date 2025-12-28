import { Action, Clipboard, Icon, showHUD } from "@raycast/api";
import setWallpaper from "../utils/wallpaper";

export function ActionSetWallpaper({ itemPath }: { itemPath: string }) {
  return (
    <Action
      title="Set Wallpaper"
      icon={Icon.Desktop}
      onAction={async () => {
        try {
          await setWallpaper(itemPath);
          await showHUD("Wallpaper set");
        } catch {
          await showHUD("Failed to set wallpaper");
        }
      }}
    />
  );
}

export function ActionCopyWallpaper({ itemPath }: { itemPath: string }) {
  return (
    <Action
      title="Copy Wallpaper"
      icon={Icon.Clipboard}
      onAction={async () => {
        try {
          const file: Clipboard.Content = { file: itemPath };
          await Clipboard.copy(file);
          await showHUD("Copied to Clipboard");
        } catch {
          await showHUD("Failed to copy wallpaper");
        }
      }}
    />
  );
}
