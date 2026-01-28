import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { ThingiverseSearchResponse } from "./types/thing";
import { GridThing } from "./components/gridThing";

export default function SearchThings() {
  const [searchText, setSearchText] = useState<string>("");

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) =>
      `${ENDPOINTS.SEARCH.replace("SEARCHTERM", searchText)}${new URLSearchParams({ type: "things", page: String(options.page + 1), per_page: String(50), sort: "popular" }).toString()}`,
    {
      headers: HEADERS,
      mapResult(result: ThingiverseSearchResponse) {
        return {
          data: result.hits,
          hasMore: !!result,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  useEffect(() => {
    revalidate();
  }, [searchText]);

  return (
    <Grid
      pagination={pagination}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for popular Things..."}
      throttle
      filtering={false}
    >
      {data.map((thing) => (
        <GridThing thing={thing} key={thing.id} />
      ))}
    </Grid>
  );
}
