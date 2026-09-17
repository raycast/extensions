import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import {
  cacheReferenceImage,
  copyReferenceImageFile,
  downloadReferenceImage,
  isImageExpired,
  pasteReferenceImageFile,
} from "../lib/image-cache";
import { toggleFavorite } from "../lib/storage";
import type { ImageReference } from "../lib/types";

type Props = {
  reference: ImageReference;
  isFavorite: boolean;
  onFavoriteChange: () => Promise<void> | void;
  onExclude?: (screenId: string) => void;
  onDownloaded: (referenceId: string, imagePath?: string) => void;
  localPath?: string;
};

function escapeMarkdown(value: string): string {
  return value.replace(/(\\|\[|\])/g, "\\$1");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function markdownSnippet(reference: ImageReference): string | undefined {
  return reference.image.url
    ? `![${escapeMarkdown(reference.appName)}](<${reference.image.url.replace(/>/g, "%3E")}>)`
    : undefined;
}

export function htmlSnippet(reference: ImageReference): string | undefined {
  return reference.image.url
    ? `<img src="${escapeHtml(reference.image.url)}" alt="${escapeHtml(reference.appName)}" />`
    : undefined;
}

export function ReferenceActions({
  reference,
  isFavorite,
  onFavoriteChange,
  onExclude,
  onDownloaded,
  localPath,
}: Props) {
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  async function runImageAction(action: "download" | "copy" | "paste") {
    setIsPreparingImage(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing Image",
      message: reference.appName,
    });
    try {
      const imagePath =
        action === "copy"
          ? await copyReferenceImageFile(reference)
          : action === "paste"
            ? await pasteReferenceImageFile(reference)
            : await downloadReferenceImage(reference);
      const quickLookPath =
        action === "download"
          ? await cacheReferenceImage(reference)
          : imagePath;
      onDownloaded(`${reference.kind}:${reference.id}`, quickLookPath);
      toast.style = Toast.Style.Success;
      toast.title =
        action === "paste"
          ? "Pasted Image"
          : action === "copy"
            ? "Copied Image File"
            : "Saved Image to Downloads";
      toast.message = imagePath;
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Image Action Failed" });
    } finally {
      setIsPreparingImage(false);
    }
  }

  async function copyTemporary(content: string, title: string) {
    await Clipboard.copy(content);
    await showToast({
      style: isImageExpired(reference.image)
        ? Toast.Style.Failure
        : Toast.Style.Success,
      title: isImageExpired(reference.image)
        ? "Copied an Expired Image URL"
        : title,
      ...(reference.image.expiresAt
        ? { message: `Temporary URL expires ${reference.image.expiresAt}` }
        : {}),
    });
  }

  async function handleToggleFavorite() {
    setIsPreparingImage(true);
    try {
      const result = await toggleFavorite(reference);
      onDownloaded(`${reference.kind}:${reference.id}`, result.localPath);
      await onFavoriteChange();
      await showToast({
        style: result.cacheWarning ? Toast.Style.Failure : Toast.Style.Success,
        title: result.added ? "Added to Favorites" : "Removed from Favorites",
        message: result.cacheWarning ?? reference.appName,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Favorite Action Failed" });
    } finally {
      setIsPreparingImage(false);
    }
  }

  const markdown = markdownSnippet(reference);
  const html = htmlSnippet(reference);
  return (
    <>
      <ActionPanel.Section title="Mobbin">
        <Action.OpenInBrowser
          title="Open in Mobbin"
          url={reference.mobbinUrl}
          icon={Icon.Globe}
        />
        <Action.CopyToClipboard
          title="Copy Mobbin URL"
          content={reference.mobbinUrl}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {reference.image.url ? (
          <Action
            title="Copy Temporary Image URL"
            icon={Icon.Clipboard}
            onAction={() =>
              copyTemporary(reference.image.url!, "Copied Image URL")
            }
          />
        ) : null}
        {markdown ? (
          <Action
            title="Copy Temporary Markdown Image"
            onAction={() => copyTemporary(markdown, "Copied Markdown Image")}
          />
        ) : null}
        {html ? (
          <Action
            title="Copy Temporary HTML Image"
            onAction={() => copyTemporary(html, "Copied HTML Image")}
          />
        ) : null}
        <Action
          title="Copy JSON Metadata"
          icon={Icon.Clipboard}
          onAction={() =>
            copyTemporary(
              JSON.stringify(reference, null, 2),
              "Copied JSON Metadata",
            )
          }
        />
        <Action.CopyToClipboard
          title="Copy App Name"
          content={reference.appName}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Image">
        {isPreparingImage ? (
          <Action title="Preparing Image…" icon={Icon.Hourglass} />
        ) : (
          <>
            <Action
              title="Download Image"
              icon={Icon.Download}
              onAction={() => runImageAction("download")}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action
              title="Copy Image File"
              icon={Icon.Clipboard}
              onAction={() => runImageAction("copy")}
            />
            <Action
              title="Paste Image File"
              icon={Icon.Clipboard}
              onAction={() => runImageAction("paste")}
            />
            {localPath ? (
              <Action.ToggleQuickLook
                title="Quick Look Image"
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              />
            ) : null}
            <Action
              title={isFavorite ? "Remove Favorite" : "Add Favorite"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={handleToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </>
        )}
        {onExclude && reference.kind === "screen" ? (
          <Action
            title="Exclude from Current Search"
            icon={Icon.XMarkCircle}
            onAction={() => onExclude(reference.id)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
        ) : null}
      </ActionPanel.Section>
    </>
  );
}
