import {
  Action,
  ActionPanel,
  closeMainWindow,
  Grid,
  Icon,
  Image,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { ImageLayout, ImageLayouts } from "../utils/consts";
import { copyImageToClipboard, ImageSearchCursor, pasteImage, saveImage, searchImage } from "../utils/helpers";
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

type ImagePaginationOptions = Omit<PaginationOptions<DuckDuckGoImage[]>, "cursor"> & {
  cursor?: ImageSearchCursor;
};

const MAX_EMPTY_PAGES = 5;

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
          macOS: {
            modifiers: ["cmd", "shift"],
            key: "enter",
          },
          Windows: {
            modifiers: ["ctrl", "shift"],
            key: "enter",
          },
        }}
        icon={Icon.Clipboard}
        onAction={() =>
          pasteImage(item).then(async (didPaste) => {
            if (!didPaste) return;
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
        shortcut={Keyboard.Shortcut.Common.Copy}
        icon={Icon.Clipboard}
        onAction={() =>
          copyImageToClipboard(item).then(async (didCopy) => {
            if (!didCopy) return;
            await showHUD("Image copied!", {
              clearRootSearch: true,
              popToRootType: PopToRootType.Immediate,
            });
          })
        }
      />
      <Action
        title="Save Image"
        shortcut={Keyboard.Shortcut.Common.Save}
        icon={Icon.Download}
        onAction={() => saveImage(item)}
      />
      <Action.CopyToClipboard
        title="Copy Image URL"
        content={item.image}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <Action.CopyToClipboard
        title="Copy Site URL"
        content={item.url}
        shortcut={{
          macOS: {
            modifiers: ["cmd", "shift", "opt"],
            key: "c",
          },
          Windows: {
            modifiers: ["ctrl", "shift", "alt"],
            key: "c",
          },
        }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [layout, setLayout] = useState<ImageLayouts>(ImageLayout["Any size"]);
  const abortable = useRef<AbortController>(new AbortController());

  // A new example query will be created on each re-render. Maybe not super optimal, but it's not too critical
  const exampleQuery = getExampleQuery();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextQuery = query.trim();
      // Keep the last valid search session active when the input is cleared.
      // This preserves both its results and its pagination cursor.
      if (nextQuery.length >= 2) setActiveQuery(nextQuery);
    }, 650);
    return () => clearTimeout(timeout);
  }, [query]);

  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string, searchLayout: ImageLayouts) =>
      async ({ cursor }: ImagePaginationOptions) => {
        const signal = abortable.current?.signal;
        const seenImageTokens = new Set(cursor?.seenImageTokens ?? []);
        const seenPageCursors = new Set(cursor?.seenPageCursors ?? []);
        let pageCursor = cursor;

        for (let pageCount = 0; pageCount < MAX_EMPTY_PAGES; pageCount += 1) {
          if (pageCursor) seenPageCursors.add(pageCursor.next);

          const { next, results, vqd } = await searchImage({
            query: searchText,
            cursor: pageCursor,
            signal,
            layout: searchLayout,
          });
          const uniqueResults = results.filter(({ image_token }) => {
            if (seenImageTokens.has(image_token)) return false;
            seenImageTokens.add(image_token);
            return true;
          });
          const hasMore = next !== undefined && !seenPageCursors.has(next);

          if (uniqueResults.length > 0 || !hasMore) {
            return {
              data: uniqueResults,
              hasMore,
              cursor: hasMore
                ? {
                    next,
                    vqd,
                    seenImageTokens: [...seenImageTokens],
                    seenPageCursors: [...seenPageCursors],
                  }
                : undefined,
            };
          }

          pageCursor = {
            next,
            vqd,
            seenImageTokens: [...seenImageTokens],
            seenPageCursors: [...seenPageCursors],
          };
        }

        return { data: [], hasMore: false, cursor: undefined };
      },
    [activeQuery, layout],
    {
      keepPreviousData: true,
      abortable,
      initialData: [],
      execute: activeQuery.length >= 2,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Image Search Failed",
          message: error.message,
        });
      },
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
