import { Action, ActionPanel, Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { SectionItemsApiResponse } from "../types/types";
import { ENDPOINTS, plex_token } from "../utils/constants";
import thumbLinks from "../utils/thumbLinks";
import { MediaItem } from "./mediaItem";

export function GetSectionItems({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const [searchText, setSearchText] = useState<string>("");

  const endpoint = `${ENDPOINTS.librarySections}${sectionId}/all`;

  const { data, isLoading } = useFetch(endpoint, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
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
      throttle
      columns={5}
      aspectRatio="2/3"
      inset={Grid.Inset.Large}
      filtering={false}
      fit={Grid.Fit.Fill}
      onSearchTextChange={setSearchText}
      navigationTitle={sectionName}
      searchBarPlaceholder={"Search " + sectionName}
    >
      {Array.isArray(filteredItems) &&
        filteredItems.map((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) => (
          <Grid.Item
            key={item.guid}
            content={{
              source: thumbLinks({ thumb: item.thumb }),
            }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<MediaItem item={item} />} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}

async function parseResponse(response: Response): Promise<SectionItemsApiResponse["MediaContainer"]["Metadata"]> {
  const json = (await response.json()) as SectionItemsApiResponse;

  if (!response.ok || !json.MediaContainer || !json.MediaContainer.Metadata) {
    throw new Error("Error in response.");
  }

  return json.MediaContainer.Metadata;
}

function filterItems(items: SectionItemsApiResponse["MediaContainer"]["Metadata"][], filter: string) {
  if (filter.length === 0) {
    return items;
  }

  return items.filter((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) =>
    item.title.toLowerCase().includes(filter.toLowerCase()),
  );
}
