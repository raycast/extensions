import { useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { ActionPanel, Color, Grid } from "@raycast/api";
import { CONTENTFUL_LIMIT, CONTENTFUL_LINKS, CONTENTFUL_LOCALE } from "./lib/config";
import { useState } from "react";
import OpenInContentful from "./lib/components/open-in-contentful";

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

      const hasMore = skip < response.total;
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
        return (
          <Grid.Item
            key={asset.sys.id}
            title={asset.fields.title[CONTENTFUL_LOCALE] || "Untitled"}
            content={
              !asset.fields.file
                ? { source: "untitled.svg", tintColor: Color.SecondaryText }
                : asset.fields.file[CONTENTFUL_LOCALE].contentType.includes("video")
                  ? { source: "video.svg", tintColor: Color.SecondaryText }
                  : `https:${asset.fields.file[CONTENTFUL_LOCALE].url}`
            }
            actions={
              <ActionPanel>
                <OpenInContentful url={`${CONTENTFUL_LINKS.space}assets/${asset.sys.id}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
