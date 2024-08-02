import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { LegoPartsResponse } from "../types/part";

export default function GetLEGOSets() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = useFetch(`${ENDPOINTS.PARTS}?search=${encodeURIComponent(searchText)}`, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching LEGO parts...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: LegoPartsResponse) {
      return {
        data: result.results,
        hasMore: !!result.next,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched LEGO parts`,
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
      searchBarPlaceholder={isLoading ? "Still loading..." : "Search for LEGO parts..."}
      throttle
      columns={5}
      filtering={false}
    >
      {!isLoading &&
        Array.isArray(data) &&
        data.map((part: LegoPartsResponse["results"]) => (
          <Grid.Item
            key={part.part_num}
            content={part.part_img_url ?? "https://rebrickable.com/static/img/nil.png"}
            title={part.name}
            subtitle={part.part_num}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={part.part_url ?? ""} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
