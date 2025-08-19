import React, { useRef, useState } from "react";
import { Action, ActionPanel, closeMainWindow, Grid, Icon, Image, PopToRootType, showHUD } from "@raycast/api";

import { useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { copyImageToClipboard, pasteImage, searchImage } from "../utils/helpers";
import { ImageLayout, ImageLayouts } from "../utils/consts";
import { DuckDuckGoImage } from "../utils/search";

const QUERY_EXAMPLES: string[] = [
  "cute cats",
  "nature landscapes",
  "abstract art wallpaper",
  "delicious food photography",
  "architecture modern buildings",
  "vintage cars",
  "space nebula",
  "colorful flowers",
  "urban street photography",
  "wildlife animals",
  "minimalist design",
  "underwater marine life",
  "mountain peaks",
  "fashion portraits",
  "historic landmarks",
];

function getExampleQuery(): string {
  return QUERY_EXAMPLES[Math.floor(Math.random() * QUERY_EXAMPLES.length)];
}

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
          modifiers: ["cmd", "shift"],
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
  const [layout, setLayout] = useState<ImageLayouts>(ImageLayout["Any size"]);
  const abortable = useRef<AbortController>(new AbortController());

  // A new example query will be created on each re-render. Maybe not super optimal, but it's not too critical
  const exampleQuery = getExampleQuery();

  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string, searchLayout: ImageLayouts) =>
      async ({ cursor }: PaginationOptions) => {
        const signal = abortable.current?.signal;
        const { next, results, vqd } = await searchImage({
          query: searchText,
          cursor,
          signal: signal,
          layout: searchLayout,
        });

        const hasMore = next !== undefined;
        return { data: results, hasMore, cursor: { next, vqd } };
      },
    [query.trim(), layout],
    {
      keepPreviousData: true,
      abortable,
      initialData: [],
    },
  );

  return (
    <Grid
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search image on DuckDuckGo"
      pagination={pagination}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Image Layout"
          storeValue={true}
          onChange={(newValue) => setLayout(newValue as ImageLayouts)}
        >
          <Grid.Dropdown.Section title="Image layout size">
            {Object.keys(ImageLayout).map((layout) => (
              <Grid.Dropdown.Item key={layout} title={layout} value={ImageLayout[layout]} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data && data.length > 0
        ? data
            .filter((item, index, self) => self.findIndex((t) => t.image_token === item.image_token) === index)
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
            ))
        : query.trim() === "" && (
            // If the query field is empty -- then we show an example query
            // Overwise we use the default behavior (No Result)
            <Grid.EmptyView
              title="Start typing your query!"
              description={`Try to type something like this: ${exampleQuery}`}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action
                    title="Use Example Query"
                    onAction={() => setQuery(exampleQuery)}
                    icon={Icon.MagnifyingGlass}
                  />
                </ActionPanel>
              }
            />
          )}
    </Grid>
  );
}
