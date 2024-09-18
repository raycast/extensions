import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ENDPOINTS, HEADERS } from "./constants/preferences";
import { LegoSetsResponse } from "../types/set";
import { LegoSetListEntry } from "./componenets/set";

export default function GetLEGOSets() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = useFetch(`${ENDPOINTS.LATESTSETS}&search=${encodeURIComponent(searchText)}`, {
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
    async onData() {
      await showToast({
        title: `Successfully fetched LEGO sets`,
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
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for LEGO Sets..."}
      throttle
      isShowingDetail
      filtering={false}
    >
      {!isLoading &&
        Array.isArray(data) &&
        data.map((set: LegoSetsResponse["results"]) => {
          return <LegoSetListEntry set={set} key={set.set_num} />;
        })}
    </List>
  );
}
