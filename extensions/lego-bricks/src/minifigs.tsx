import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { LegoMinifigsResponse } from "../types/minifig";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { ErrorResponse } from "../types/error";

export default function GetLEGOMiniFigs() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, pagination } = useFetch(
    (options) => `${ENDPOINTS.MINIFIGS}?search=${encodeURIComponent(searchText)}&page=${options.page + 1}`,
    {
      headers: HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching LEGO Mini Figures...`,
          style: Toast.Style.Animated,
        });
      },
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          throw new Error(result.detail);
        }
        const result = (await response.json()) as LegoMinifigsResponse;
        return result;
      },
      mapResult(result) {
        return {
          data: result.results,
          hasMore: !!result.next,
        };
      },
      async onData(data) {
        await showToast({
          title: `Successfully fetched ${data.length} LEGO Mini Figures`,
          style: Toast.Style.Success,
        });
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for LEGO Minifigures..."}
      throttle
      columns={5}
      filtering={false}
      pagination={pagination}
    >
      {data.map((minifig) => (
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
