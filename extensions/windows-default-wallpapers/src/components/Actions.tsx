import { Action, Icon, showHUD } from "@raycast/api";
import setWallpaper from "../utils/wallpaper";
import { fullPath } from "../utils/helpers";
import PreviewDetail from "./PreviewDetail";

export function ActionSetWallpaper({ itemPath }: { itemPath: string }) {
  return (
    <Action
      title="Set Wallpaper"
      icon={Icon.Desktop}
      onAction={async () => {
        await setWallpaper(fullPath(itemPath));
        await showHUD("Wallpaper set");
      }}
    />
  );
}

export function ActionCopyWallpaper({ itemPath }: { itemPath: string }) {
  return <Action.CopyToClipboard content={{ file: fullPath(itemPath) }} />;
}

export function ActionPreviewWallpaper({ itemPath }: { itemPath: string }) {
  return (
    <Action.Push
      title="Preview"
      icon={Icon.Eye}
      target={<PreviewDetail itemPath={itemPath} />}
      shortcut={{ modifiers: ["shift"], key: "enter" }}
    />
  );
}
