import { Grid } from "@raycast/api";
import { SearchGridItem } from "./components/search_list_item";
import { useSearch } from "./hooks/use_search";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Small}
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search by name..."
      throttle
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
