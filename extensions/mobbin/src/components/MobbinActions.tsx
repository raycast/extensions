import { Action, Clipboard, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { copyScreenImageFile, downloadScreenImage, pasteScreenImageFile } from "../lib/image-cache";
import { toggleFavorite } from "../lib/storage";
import type { Screen } from "../lib/types";

type Props = {
  screen: Screen;
  isFavorite: boolean;
  onFavoriteChange: () => void;
  onExclude: (screenId: string) => void;
  onDownloaded: (screenId: string, imagePath: string) => void;
};

function markdownSnippet(screen: Screen): string {
  return `![${screen.app_name}](${screen.image_url})`;
}

function htmlSnippet(screen: Screen): string {
  return `<img src="${screen.image_url}" alt="${screen.app_name}" />`;
}

export function MobbinActions({ screen, isFavorite, onFavoriteChange, onExclude, onDownloaded }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function runImageAction(action: "download" | "copy" | "paste") {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: action === "paste" ? "Preparing image" : "Downloading image",
      message: screen.app_name,
    });

    setIsDownloading(true);
    try {
      const imagePath =
        action === "copy"
          ? await copyScreenImageFile(screen)
          : action === "paste"
            ? await pasteScreenImageFile(screen)
            : await downloadScreenImage(screen);

      onDownloaded(screen.id, imagePath);
      toast.style = Toast.Style.Success;
      toast.title = action === "paste" ? "Pasted image" : action === "copy" ? "Copied image file" : "Downloaded image";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Image action failed" });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleToggleFavorite() {
    const next = await toggleFavorite(screen);
    onFavoriteChange();
    await showToast({
      style: Toast.Style.Success,
      title: next ? "Added to favorites" : "Removed from favorites",
      message: screen.app_name,
    });
  }

  return (
    <>
      <Action.OpenInBrowser title="Open in Mobbin" url={screen.mobbin_url} icon={Icon.Globe} />
      <Action.CopyToClipboard title="Copy Mobbin URL" content={screen.mobbin_url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.CopyToClipboard title="Copy Image URL" content={screen.image_url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard title="Copy Markdown Image" content={markdownSnippet(screen)} />
      <Action.CopyToClipboard title="Copy HTML Image" content={htmlSnippet(screen)} />
      <Action.CopyToClipboard title="Copy JSON Metadata" content={JSON.stringify(screen, null, 2)} />
      <Action.CopyToClipboard title="Copy App Name" content={screen.app_name} />
      <Action
        title="Download Image"
        icon={Icon.Download}
        onAction={() => runImageAction("download")}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action title="Copy Image File" icon={Icon.Clipboard} onAction={() => runImageAction("copy")} />
      <Action title="Paste Image File" icon={Icon.Clipboard} onAction={() => runImageAction("paste")} />
      <Action
        title={isFavorite ? "Remove Favorite" : "Add Favorite"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        onAction={handleToggleFavorite}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action
        title="Exclude from Current Search"
        icon={Icon.XMarkCircle}
        onAction={() => onExclude(screen.id)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
      />
      <Action
        title="Copy Search Prompt"
        icon={Icon.MagnifyingGlass}
        onAction={() => Clipboard.copy(`${screen.app_name} ${screen.platform} screens`)}
      />
      {isDownloading ? <Action title="Downloading…" icon={Icon.Hourglass} onAction={() => undefined} /> : null}
    </>
  );
}
