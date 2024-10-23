import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { LegoPartsResponse } from "../types/part";
import { ErrorResponse } from "../types/error";

export default function GetLEGOSets() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, pagination } = useFetch(
    (options) => `${ENDPOINTS.PARTS}?search=${encodeURIComponent(searchText)}&page=${options.page + 1}`,
    {
      headers: HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching LEGO parts...`,
          style: Toast.Style.Animated,
        });
      },
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          throw new Error(result.detail);
        }
        const result = (await response.json()) as LegoPartsResponse;
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
          title: `Successfully fetched ${data.length} LEGO parts`,
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
      searchBarPlaceholder={"Search for LEGO parts..."}
      throttle
      columns={5}
      filtering={false}
      pagination={pagination}
    >
      {data.map((part) => (
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
