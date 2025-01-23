import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { LegoSetsResponse } from "../types/set";
import { LegoSetListEntry } from "./componenets/set";

export default function GetLEGOSets() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate, pagination } = useFetch(
    (options) => `${ENDPOINTS.SETS}?search=${encodeURIComponent(searchText)}&page=${options.page + 1}`,
    {
      headers: HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching LEGO sets...`,
          style: Toast.Style.Animated,
        });
      },
      mapResult(result: LegoSetsResponse) {
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

  useEffect(() => {
    revalidate();
  }, [searchText]);

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
      {data.map((set) => {
        return <LegoSetListEntry set={set} key={set.set_num} />;
      })}
    </List>
  );
}
