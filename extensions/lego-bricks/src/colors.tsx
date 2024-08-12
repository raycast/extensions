import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { LegoColorsResponse } from "../types/color";
import { ENDPOINTS, HEADERS } from "./constants/preferences";

export default function GetLEGOColors() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading } = useFetch(ENDPOINTS.COLORS, {
    headers: HEADERS,
    parseResponse,
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
    >
      {!isLoading &&
        Array.isArray(filteredItems) &&
        filteredItems.map((color: LegoColorsResponse["results"]) => (
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

async function parseResponse(response: Response): Promise<LegoColorsResponse["results"]> {
  const json = (await response.json()) as LegoColorsResponse;

  if (!response.ok) {
    throw new Error("Error in response.");
  }

  await showToast(Toast.Style.Success, `Successfully fetched ${json.count.toString()} LEGO Colors`);

  return json.results;
}

function filterItems(items: LegoColorsResponse["results"][], filter: string) {
  if (filter.length === 0) {
    return items;
  }

  return items.filter((item: LegoColorsResponse["results"]) => item.name.toLowerCase().includes(filter.toLowerCase()));
}
