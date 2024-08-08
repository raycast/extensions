import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { LegoMinifigsResponse } from "../types/minifig";
import { ENDPOINTS, HEADERS } from "./constants/preferences";

export default function GetLEGOMiniFigs() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = useFetch(`${ENDPOINTS.MINIFIGS}?search=${encodeURIComponent(searchText)}`, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching LEGO Mini Figures...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: LegoMinifigsResponse) {
      return {
        data: result.results,
        hasMore: !!result.next,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched LEGO Mini Figures`,
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
      searchBarPlaceholder={isLoading ? "Still loading..." : "Search for LEGO Minifigures..."}
      throttle
      columns={5}
      filtering={false}
    >
      {!isLoading &&
        Array.isArray(data) &&
        data.map((minifig: LegoMinifigsResponse["results"]) => (
          <Grid.Item
            key={minifig.set_url}
            content={minifig.set_img_url ?? "https://rebrickable.com/static/img/nil_mf.jpg"}
            title={minifig.name}
            subtitle={minifig.num_parts.toString() + " parts"}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={minifig.set_url ?? ""} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
