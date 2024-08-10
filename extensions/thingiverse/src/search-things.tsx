import { Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { ThingiverseSearchResponse } from "./types/thing";
import { GridThing } from "./components/gridThing";

export default function SearchThings() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = useFetch(`${ENDPOINTS.SEARCH}`, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching popular Things...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: ThingiverseSearchResponse) {
      return {
        data: result.hits,
        hasMore: !!result,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched Things`,
        style: Toast.Style.Success,
      });
    },
    initialData: [],
    keepPreviousData: true,
  });

  useEffect(() => {
    revalidate();
  }, [searchText]);

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={isLoading ? "Still loading..." : "Search for popular Things..."}
      throttle
      filtering={false}
    >
      {!isLoading &&
        Array.isArray(data) &&
        data.map((thing: ThingiverseSearchResponse["hits"]) => {
          return <GridThing thing={thing} key={thing.id} />;
        })}
    </Grid>
  );
}
