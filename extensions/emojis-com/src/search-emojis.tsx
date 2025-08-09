import { Action, ActionPanel, Clipboard, closeMainWindow, Grid, Icon, showToast, Toast } from "@raycast/api";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { useCallback, useMemo, useState } from "react";

import { createImgproxyUrl } from "@/utils/imgproxy";

import { type Emoji, useRaycastEmojisSearch } from "@/hooks/use-raycast-emojis-search";
import { ModelCategory, SearchEmojiOrder } from "@/utils/graphql/types.generated";
import { URLS } from "@/utils/urls";
import { Providers } from "./components/providers";
import { showFailureToast } from "@raycast/utils";

function SearchEmojisList() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useRaycastEmojisSearch({
    variables: {
      query: searchText,
      first: 50,
      order: SearchEmojiOrder.Recent,
      modelCategory: ModelCategory.Emojis,
    },
  });

  const emojis = useMemo(
    () =>
      data?.pages
        .flatMap((page) => page.searchEmojis?.nodes ?? [])
        .flatMap((emoji) => {
          if (!emoji.blob?.url) return [];

          const url = createImgproxyUrl({
            src: emoji.blob.url,
            options: {
              format: "png",
              width: 240,
              height: 240,
              quality: 75,
            },
          });

          return { ...emoji, url };
        }) ?? [],
    [data],
  );

  const copyEmojiImage = useCallback(async (emoji: Emoji) => {
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
  }, []);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search emojis.com"
    >
      {emojis.length === 0 && !isLoading ? <Grid.EmptyView title="Type to search emojis.com" /> : null}
      {emojis.map((emoji) => (
        <Grid.Item
          key={emoji.id}
          content={emoji.url}
          actions={
            <ActionPanel>
              <Action icon={Icon.CopyClipboard} title="Copy Image" onAction={() => void copyEmojiImage(emoji)} />
              <Action.CopyToClipboard title="Copy Image URL" content={emoji.url} />
              <Action.OpenInBrowser url={URLS.emojis.emoji(emoji.slug)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

export default function Command() {
  return (
    <Providers>
      <SearchEmojisList />
    </Providers>
  );
}
