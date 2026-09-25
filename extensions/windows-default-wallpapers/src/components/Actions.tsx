import { Action, Clipboard, Detail, Icon, Keyboard, showHUD } from "@raycast/api";
import setWallpaper from "../utils/wallpaper";
import { showFailureToast } from "@raycast/utils";
import { Wallpaper } from "../types";

export function PreviewWallpaperAction({ wallpaper }: { wallpaper: Wallpaper }) {
  return (
    <Action.Push
      icon={Icon.Eye}
      title="Preview Wallpaper"
      target={
        <Detail
          markdown={`![](file:///${encodeURI(wallpaper.path.replaceAll("\\", "/"))})`}
          navigationTitle={`${wallpaper.name} — Preview`}
        />
      }
    />
  );
}

export function SetWallpaperAction({ itemPath, shortcut }: { itemPath: string; shortcut?: Action.Props["shortcut"] }) {
  return (
    <Action
      title="Set Wallpaper"
      icon={Icon.Desktop}
      onAction={async () => {
        try {
          await setWallpaper(itemPath);
          await showHUD("Wallpaper set");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showFailureToast(message, { title: "Failed to set wallpaper" });
        }
      }}
      shortcut={shortcut}
    />
  );
}

export function CopyWallpaperAction({ itemPath }: { itemPath: string }) {
  return (
    <Action
      title="Copy Wallpaper"
      icon={Icon.Clipboard}
      onAction={async () => {
        try {
          const file: Clipboard.Content = { file: itemPath };
          await Clipboard.copy(file);
          await showHUD("Copied to Clipboard");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showFailureToast(message, { title: "Failed to copy wallpaper" });
        }
      }}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}
