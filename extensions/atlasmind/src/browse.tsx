import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { deleteItem, getItems, updateItem } from "./db";
import { fetchOg } from "./fetch-og";
import { rankItems } from "./search";
import type { Item } from "./types";

const TILE_COLORS: Color[] = [
  Color.Blue,
  Color.Purple,
  Color.Magenta,
  Color.Red,
  Color.Orange,
  Color.Yellow,
  Color.Green,
];

function pickColor(seed: string): Color {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

function tileContent(item: Item): Grid.Item.Props["content"] {
  if (item.og_image) return { source: item.og_image };
  return { color: pickColor(item.id) };
}

function displayTitle(item: Item): string {
  return item.title || item.og_title || item.content.slice(0, 80);
}

export default function Command() {
  const [query, setQuery] = useState("");
  const {
    data: allItems = [],
    isLoading,
    revalidate,
  } = useCachedPromise(getItems);

  const items: Item[] = useMemo(
    () => rankItems(allItems, query),
    [allItems, query],
  );

  async function handleDelete(id: string) {
    if (await confirmAlert({ title: "Delete this item?" })) {
      await deleteItem(id);
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    }
  }

  async function handleRefetch(item: Item) {
    if (item.type !== "url") return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Re-fetching preview…",
    });
    const { image, title, description, bodyExcerpt } = await fetchOg(
      item.content,
    );
    await updateItem(item.id, {
      og_image: image,
      og_title: title,
      og_description: description,
      body_excerpt: bodyExcerpt,
    });
    await revalidate();
    toast.style = Toast.Style.Success;
    toast.title = image ? "Preview updated" : "Still no preview";
  }

  async function handleRefetchAll() {
    const urlItems = items.filter((i) => i.type === "url");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Re-fetching ${urlItems.length} previews…`,
    });
    let ok = 0;
    for (const item of urlItems) {
      const { image, title, description, bodyExcerpt } = await fetchOg(
        item.content,
      );
      await updateItem(item.id, {
        og_image: image,
        og_title: title,
        og_description: description,
        body_excerpt: bodyExcerpt,
      });
      if (image) ok++;
    }
    await revalidate();
    toast.style = Toast.Style.Success;
    toast.title = `Updated ${ok}/${urlItems.length}`;
  }

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search anything…"
    >
      {items.length === 0 && !isLoading ? (
        <Grid.EmptyView
          title="Nothing saved yet"
          description="Run 'Save to AtlasMind' or 'Save Current Browser Tab' to capture something."
        />
      ) : (
        items.map((item) => (
          <Grid.Item
            key={item.id}
            content={tileContent(item)}
            title={displayTitle(item)}
            subtitle={
              item.tags
                ? item.tags
                    .split(",")
                    .map((t) => `#${t.trim()}`)
                    .join(" ")
                : undefined
            }
            actions={
              <ActionPanel>
                {item.type === "url" && (
                  <Action.OpenInBrowser url={item.content} />
                )}
                <Action.CopyToClipboard
                  content={item.content}
                  title="Copy Content"
                />
                {item.title && (
                  <Action.CopyToClipboard
                    content={item.title}
                    title="Copy Title"
                  />
                )}
                {item.type === "url" && (
                  <Action
                    title="Re-fetch Preview"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => handleRefetch(item)}
                  />
                )}
                <Action
                  title="Re-fetch All Previews"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={handleRefetchAll}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(item.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
