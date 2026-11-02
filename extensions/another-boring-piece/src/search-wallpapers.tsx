import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { DownloadWallpaperAction, SetWallpaperAction } from "./actions";
import { buildWallpaperMarkdown, getThumbnailUrl } from "./utils";
import { fetchWallpaperCatalog } from "./wallpaper-catalog";
import { createWallpaperSearch } from "./wallpaper-search";

export default function Command() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, revalidate } = useCachedPromise(
    fetchWallpaperCatalog,
  );
  const search = useMemo(() => createWallpaperSearch(data ?? []), [data]);
  const wallpapers = useMemo(() => search(query), [search, query]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search by title, artist, subject, color, or mood…"
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          isLoading
            ? "Loading Wallpapers"
            : error
              ? "Could Not Load Wallpapers"
              : "No Wallpapers Found"
        }
        description={
          error
            ? "Try loading the gallery again."
            : "Try an artist, a color, or a mood, such as Monet, blue, or calm."
        }
        actions={
          <ActionPanel>
            <Action
              title="Reload Wallpapers"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel>
        }
      />
      {wallpapers.map((wallpaper) => (
        <List.Item
          key={wallpaper.id}
          id={wallpaper.id}
          title={`${wallpaper.name} by ${wallpaper.artist}`}
          icon={{
            source: getThumbnailUrl(wallpaper.url, { width: 100 }),
            mask: Image.Mask.RoundedRectangle,
          }}
          detail={
            <List.Item.Detail markdown={buildWallpaperMarkdown(wallpaper)} />
          }
          actions={
            <ActionPanel>
              <SetWallpaperAction
                wallpaper={wallpaper}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "w" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "w" },
                }}
              />
              <ActionPanel.Section>
                <DownloadWallpaperAction wallpaper={wallpaper} />
                <Action.OpenInBrowser
                  title="Learn More"
                  url={wallpaper.websiteUrl}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  title="Reload Wallpapers"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
