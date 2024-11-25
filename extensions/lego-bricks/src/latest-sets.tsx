import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { LegoSetsResponse } from "../types/set";
import { LegoSetListEntry } from "./componenets/set";
import { ErrorResponse } from "../types/error";

export default function GetLEGOSets() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, pagination } = useFetch(
    (options) => `${ENDPOINTS.LATESTSETS}&search=${encodeURIComponent(searchText)}&page=${options.page + 1}`,
    {
      headers: HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching LEGO sets...`,
          style: Toast.Style.Animated,
        });
      },
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          throw new Error(result.detail);
        }
        const result = (await response.json()) as LegoSetsResponse;
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
          title: `Successfully fetched ${data.length} LEGO sets`,
          style: Toast.Style.Success,
        });
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for LEGO Sets..."}
      throttle
      isShowingDetail
      filtering={false}
      pagination={pagination}
    >
      {data.map((set, index) => {
        return <LegoSetListEntry set={set} key={`${index}_${set.set_num}`} />;
      })}
    </List>
  );
}
