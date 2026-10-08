import { Action, ActionPanel, Clipboard, closeMainWindow, Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { memo } from "react";
import { Emoji } from "../../hooks/use-raycast-emojis-search";
import { createImgproxyUrl } from "../../utils/imgproxy";
import { URLS } from "../../utils/urls";

interface EmojiGridItemProps {
  emoji: Emoji;
}

const EmojiGridItem = memo(
  ({ emoji }: EmojiGridItemProps) => {
    const blobUrl = emoji.blob?.url;
    const url = (() => {
      if (!emoji.blob?.url) return undefined;

      return createImgproxyUrl({
        src: emoji.blob.url,
        options: {
          format: "png",
          width: 240,
          height: 240,
          quality: 75,
        },
      });
    })();

    const copyEmojiImage = async () => {
      if (!emoji.blob?.url) {
        await showToast({ style: Toast.Style.Failure, title: "No image available" });
        return;
      }

      try {
        const res = await fetch(emoji.blob.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const extMatch = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(emoji.blob.url);
        const ext = extMatch ? extMatch[1] : "png";
        const tempFile = path.join(os.tmpdir(), `${emoji.slug}-${Date.now()}.${ext}`);
        await fs.writeFile(tempFile, buffer);
        await Clipboard.copy({ file: tempFile });
        await closeMainWindow();
        await showToast({ title: "Copied image to clipboard", message: emoji.prompt });
      } catch (error) {
        console.error(error);
        showFailureToast(error, { title: "Failed to copy" });
      }
    };

    if (!blobUrl || !url) return null;

    return (
      <Grid.Item
        content={url}
        actions={
          <ActionPanel>
            <Action icon={Icon.CopyClipboard} title="Copy Image" onAction={() => void copyEmojiImage()} />
            <Action.CopyToClipboard title="Copy Image URL" content={blobUrl} />
            <Action.OpenInBrowser url={URLS.emojis.emoji(emoji.slug)} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel>
        }
      />
    );
  },
  (prevProps, nextProps) => prevProps.emoji.id === nextProps.emoji.id,
);

EmojiGridItem.displayName = "EmojiGridItem";

export { EmojiGridItem };
