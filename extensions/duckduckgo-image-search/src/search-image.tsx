import React from "react";
import { useRef, useState } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  Image,
  showHUD,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";

import { useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import {
  copyImageToClipboard,
  pasteImage,
  searchImage,
} from "../utils/helpers";
import { ImageLayout } from "../utils/consts";
import { DuckDuckGoImage } from "../utils/search";

function ActionsPanel({ item }: { item: DuckDuckGoImage }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Image in Browser" url={item.image} />
      <Action
        title="Paste Image"
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "enter",
        }}
        icon={Icon.Clipboard}
        onAction={() =>
          pasteImage(item).then(async () => {
            await closeMainWindow({
              clearRootSearch: true,
            });
          })
        }
      />
      <Action.OpenInBrowser
        title="Open Site in Browser"
        url={item.url}
        shortcut={{
          modifiers: ["shift"],
          key: "enter",
        }}
      />
      <Action
        title="Copy Image"
        shortcut={{
          modifiers: ["cmd"],
          key: "c",
        }}
        icon={Icon.Clipboard}
        onAction={() =>
          copyImageToClipboard(item).then(async () => {
            await showHUD("Image copied!", {
              clearRootSearch: true,
              popToRootType: PopToRootType.Immediate,
            });
          })
        }
      />
      <Action.CopyToClipboard
        title="Copy Image URL"
        content={item.image}
        shortcut={{
          modifiers: ["cmd", "opt"],
          key: "c",
        }}
      />
      <Action.CopyToClipboard
        title="Copy Site URL"
        content={item.url}
        shortcut={{
          modifiers: ["cmd", "shift", "opt"],
          key: "c",
        }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [, setLayout] = useState<string>(ImageLayout["Any size"]);
  const abortable = useRef<AbortController>();

  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string) =>
      async ({ cursor }: PaginationOptions) => {
        const { next, results, vqd } = await searchImage({
          query: searchText,
          cursor,
        });

        const hasMore = next !== undefined;
        return { data: results, hasMore, cursor: { next, vqd } };
      },
    [query],
    {
      keepPreviousData: true,
      abortable,
    },
  );

  return (
    <Grid
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search image on DuckDuckGo"
      pagination={pagination}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Image Layout"
          storeValue={true}
          onChange={(newValue) => setLayout(newValue)}
        >
          <Grid.Dropdown.Section title="Image layout size">
            {Object.keys(ImageLayout).map((layout) => (
              <Grid.Dropdown.Item key={layout} title={layout} value={layout} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data &&
        data
          .filter(
            (item, index, self) =>
              self.findIndex((t) => t.image_token === item.image_token) ===
              index,
          )
          .map((item) => (
            <Grid.Item
              key={item.image_token}
              content={
                {
                  source: item.thumbnail,
                } as Image
              }
              title={item.title}
              id={item.image_token}
              accessory={{
                icon: Icon.Link,
                tooltip: `Source: ${item.source}`,
              }}
              actions={<ActionsPanel item={item} />}
            />
          ))}
    </Grid>
  );
}
