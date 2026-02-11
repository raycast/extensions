import { Grid, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

import { Providers } from "./components/providers";
import { useRaycastEmojisSearch } from "./hooks/use-raycast-emojis-search";
import { ModelCategory, SearchEmojiOrder } from "./utils/graphql/types.generated";
import { EmojiGridItem } from "./components/emoji-grid-item";

const PAGE_SIZE = 50;

function SearchEmojisList() {
  const [searchText, setSearchText] = useState("");
  const { gridColumns } = getPreferenceValues<Preferences>();
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useRaycastEmojisSearch({
    variables: {
      query: searchText,
      first: PAGE_SIZE,
      order: SearchEmojiOrder.Recent,
      modelCategory: ModelCategory.Emojis,
    },
  });
  const emojis = data?.pages.flatMap((page) => page.searchEmojis?.nodes ?? []) ?? [];

  return (
    <Grid
      columns={Number(gridColumns)}
      inset={Grid.Inset.Medium}
      isLoading={isLoading || isFetching || isFetchingNextPage}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search emojis.com"
      pagination={{
        onLoadMore: () => {
          if (!hasNextPage || isFetching || isFetchingNextPage) return;
          void fetchNextPage();
        },
        hasMore: hasNextPage,
        pageSize: PAGE_SIZE,
      }}
    >
      {emojis.length === 0 && !isLoading ? <Grid.EmptyView title="No emojis found" /> : null}
      {emojis.map((emoji, index) => (
        // use a compound key w/ index as a temporary fix for search endpoint that may return duplicate items
        <EmojiGridItem key={`${emoji.id}-${index}`} emoji={emoji} />
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
