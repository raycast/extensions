import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { useCallback, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getCollections, getCollectionWallpapers } from "./api";
import { Collection, Wallpaper } from "./types";
import { WallpaperGrid } from "./components/WallpaperGrid";

function CollectionWallpapers({
  collection,
  username,
}: {
  collection: Collection;
  username: string;
}) {
  const allWallpapers = useRef<Wallpaper[]>([]);
  const currentPage = useRef(1);
  const hasMore = useRef(true);

  const { isLoading, revalidate } = useCachedPromise(
    async (user: string, id: number, page: number) => {
      const result = await getCollectionWallpapers(user, id, page);
      hasMore.current = result.meta.current_page < result.meta.last_page;
      if (page === 1) {
        allWallpapers.current = result.data;
      } else {
        allWallpapers.current = [...allWallpapers.current, ...result.data];
      }
      return allWallpapers.current;
    },
    [username, collection.id, currentPage.current],
    { keepPreviousData: true },
  );

  const onLoadMore = useCallback(() => {
    if (hasMore.current && !isLoading) {
      currentPage.current += 1;
      revalidate();
    }
  }, [isLoading, revalidate]);

  return (
    <WallpaperGrid
      wallpapers={allWallpapers.current}
      isLoading={isLoading}
      hasMore={hasMore.current}
      onLoadMore={onLoadMore}
      navigationTitle={collection.label}
      searchBarPlaceholder={`${collection.label} wallpapers`}
    />
  );
}

export default function MyCollections() {
  const { apiKey, username } = getPreferenceValues<Preferences>();

  const { data: collectionsData, isLoading } = useCachedPromise(
    async () => {
      const result = await getCollections();
      return result.data;
    },
    [],
    { execute: !!apiKey && !!username },
  );

  if (!apiKey || !username) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="API Key and Username Required"
          description="Set your Wallhaven API key and username in extension preferences to access collections."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      {collectionsData?.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.label}
          subtitle={`${collection.count} wallpapers`}
          accessories={[
            { tag: collection.public ? "Public" : "Private" },
            { text: `${collection.views} views` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Collection"
                target={
                  <CollectionWallpapers
                    collection={collection}
                    username={username}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
