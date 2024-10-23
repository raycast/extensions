import { useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { Action, ActionPanel, Grid } from "@raycast/api";
import { CONTENTFUL_APP_URL, CONTENTFUL_LIMIT, CONTENTFUL_LOCALE, CONTENTFUL_SPACE } from "./lib/config";
import { useState } from "react";

export default function SearchAssets() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: assets,
    pagination,
  } = useCachedPromise(
    (query_text: string) => async (options: { page: number }) => {
      const skip = options.page * CONTENTFUL_LIMIT;
      const response = await CONTENTFUL.asset.getMany({
        query: {
          skip,
          limit: CONTENTFUL_LIMIT,
          query: query_text,
        },
      });

      const hasMore = CONTENTFUL_LIMIT * options.page < response.total;
      return {
        data: response.items,
        hasMore,
      };
    },
    [searchText],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarPlaceholder="Search assets"
      onSearchTextChange={setSearchText}
    >
      {assets.map((asset) => {
        const url = `${CONTENTFUL_APP_URL}spaces/${CONTENTFUL_SPACE}/assets/${asset.sys.id}`;
        return (
          <Grid.Item
            key={asset.sys.id}
            title={asset.fields.title[CONTENTFUL_LOCALE]}
            content={"https:" + asset.fields.file[CONTENTFUL_LOCALE].url}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
