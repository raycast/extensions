import { searchSmart } from "@immich/sdk";
import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAssetThumbnail, initialize } from "./immich";
import { useState } from "react";
import AssetView from "./views/asset-view";

export default function Explore() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: assets,
    pagination,
  } = useCachedPromise(
    (query: string) => async (options) => {
      initialize();
      if (!query.trim()) return { data: [], hasMore: false };
      const res = await searchSmart({
        smartSearchDto: {
          query,
          size: 15,
          page: options.page + 1,
          withExif: false,
        },
      });
      return {
        data: res.assets.items,
        hasMore: !!res.assets.nextPage,
      };
    },
    [searchText],
    { initialData: [] },
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search your photos"
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!isLoading && !assets.length ? (
        <Grid.EmptyView icon={Icon.MagnifyingGlass} title="Enter something to start searching" />
      ) : (
        assets.map((asset) => (
          <Grid.Item
            key={asset.id}
            content={getAssetThumbnail(asset.id)}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Info} title="View Asset" target={<AssetView asset={asset} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
