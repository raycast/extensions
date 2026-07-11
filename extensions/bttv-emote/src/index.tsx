import { Grid } from "@raycast/api";
import { SearchGridItem } from "./components/search_list_item";
import { useSearch } from "./hooks/use_search";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const state = useSearch(searchText);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name..."
      throttle
      pagination={state.pagination}
    >
      {state.results.length === 0 ? (
        <Grid.EmptyView
          icon={{ source: "https://cdn.betterttv.net/emote/604b93f1306b602acc59b8f8/3x.png" }}
          title="Type an emote name to get started..."
        />
      ) : (
        <Grid.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <SearchGridItem key={searchResult.id} searchResult={searchResult} />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
