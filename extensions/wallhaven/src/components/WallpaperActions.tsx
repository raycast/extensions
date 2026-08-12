import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { Wallpaper } from "../types";
import {
  downloadImage,
  getFileExtension,
  getTempFilePath,
  setDesktopWallpaper,
} from "../utils";
import { WallpaperPreview } from "./WallpaperPreview";
import { SimilarWallpapers } from "./SimilarWallpapers";

async function downloadToTemp(wallpaper: Wallpaper): Promise<string> {
  const ext = getFileExtension(wallpaper.path);
  const tempPath = getTempFilePath(`wallhaven-${wallpaper.id}.${ext}`);
  await downloadImage(wallpaper.path, tempPath);
  return tempPath;
}

export function WallpaperActions({ wallpaper }: { wallpaper: Wallpaper }) {
  const { downloadDir } = getPreferenceValues<Preferences>();
  const resolvedDownloadDir = downloadDir || join(homedir(), "Downloads");

  async function handleSetWallpaperAll() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting wallpaper on all desktops...",
    });
    try {
      const tempPath = await downloadToTemp(wallpaper);
      await setDesktopWallpaper(tempPath, true);
      toast.hide();
      await showHUD("Wallpaper set on all desktops!");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set wallpaper";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleSetWallpaperCurrent() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting wallpaper on current desktop...",
    });
    try {
      const tempPath = await downloadToTemp(wallpaper);
      await setDesktopWallpaper(tempPath, false);
      toast.hide();
      await showHUD("Wallpaper set on current desktop!");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set wallpaper";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleDownload() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
    });
    try {
      await mkdir(resolvedDownloadDir, { recursive: true });
      const ext = getFileExtension(wallpaper.path);
      const destPath = join(
        resolvedDownloadDir,
        `wallhaven-${wallpaper.id}.${ext}`,
      );
      await downloadImage(wallpaper.path, destPath);
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded!";
      toast.message = destPath;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleCopyImage() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Copying image...",
    });
    try {
      const tempPath = await downloadToTemp(wallpaper);
      await Clipboard.copy({ file: tempPath });
      toast.hide();
      await showHUD("Image copied to clipboard!");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy image";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Wallpaper">
        <Action
          title="Set on All Desktops"
          icon={Icon.Desktop}
          onAction={handleSetWallpaperAll}
        />
        <Action
          title="Set on Current Desktop"
          icon={Icon.Monitor}
          shortcut={{ modifiers: ["shift", "cmd"], key: "w" }}
          onAction={handleSetWallpaperCurrent}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        <Action.Push
          title="Preview Wallpaper"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          target={
            <WallpaperPreview
              wallpaper={wallpaper}
              actions={<WallpaperActions wallpaper={wallpaper} />}
            />
          }
        />
        <Action.Push
          title="Search Similar"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          target={<SimilarWallpapers wallpaperId={wallpaper.id} />}
        />
        <Action.OpenInBrowser
          title="Open in Browser"
          url={wallpaper.url}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Save">
        <Action
          title="Download"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={handleDownload}
        />
        <Action
          title="Copy Image to Clipboard"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          onAction={handleCopyImage}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Image URL"
          content={wallpaper.path}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Wallpaper ID"
          content={wallpaper.id}
        />
        <Action.CopyToClipboard
          title="Copy Color Palette"
          content={wallpaper.colors.join(", ")}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
