import { useMemo, useState } from "react";
import { Grid, List } from "@raycast/api";
import useSearch from "@/hooks/useSearch";
import SearchItem from "./components/SearchItem";
import { getShowAs } from "./lib";

const SearchPlants = () => {
  const [query, setQuery] = useState("");
  const { data, isLoading, pagination, total } = useSearch(query);

  const showType = useMemo(() => getShowAs(), []);
  const Component: typeof List | typeof Grid = showType ? Grid : List;

  return (
    <Component
      searchBarPlaceholder="Search plants..."
      isLoading={isLoading}
      searchText={query}
      pagination={pagination}
      onSearchTextChange={setQuery}
      throttle
    >
      <Component.Section title={`Search results: ${total}`}>
        {data.map((plant) => (
          <SearchItem key={plant.id} plant={plant} type={showType} />
        ))}
      </Component.Section>
      {!isLoading ? (
        <Component.EmptyView
          title={query === "" ? "Search Plants" : "No plants found"}
          icon={{ source: "logo_trefle.svg", tintColor: "green" }}
        />
      ) : (
        <Component.EmptyView title="Searching..." icon={{ source: "logo_trefle.svg", tintColor: "green" }} />
      )}
    </Component>
  );
};

export default SearchPlants;
