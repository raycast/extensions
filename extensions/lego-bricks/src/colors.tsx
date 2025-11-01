import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { LegoColorsResponse } from "../types/color";
import { ErrorResponse } from "../types/error";
import { ENDPOINTS, HEADERS } from "./constants/preferences";

export default function GetLEGOColors() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, pagination } = useFetch((options) => ENDPOINTS.COLORS + `?page=${options.page + 1}`, {
    headers: HEADERS,
    async parseResponse(response) {
      if (!response.ok) {
        const result = (await response.json()) as ErrorResponse;
        throw new Error(result.detail);
      }
      const result = (await response.json()) as LegoColorsResponse;
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
        title: `Successfully fetched ${data.length} LEGO colors`,
        style: Toast.Style.Success,
      });
    },
    initialData: [],
    keepPreviousData: true,
  });

  const filteredItems = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return filterItems(items, searchText);
  }, [searchText, data]);

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for LEGO Colors..."}
      throttle
      columns={7}
      filtering={false}
      pagination={pagination}
    >
      {filteredItems.map((color) => (
        <Grid.Item
          key={color.id}
          content={{
            color: color.rgb,
          }}
          title={color.name}
          subtitle={color.rgb}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={color.rgb} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function filterItems(items: LegoColorsResponse["results"], filter: string) {
  if (filter.length === 0) {
    return items;
  }

  return items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
}
