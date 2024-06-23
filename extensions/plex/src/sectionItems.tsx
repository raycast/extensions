import { ActionPanel, Action, Grid } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import React from "react";
import { useState, useEffect } from "react";
import { ENDPOINTS, plex_token } from "../utils/constants";
import { SectionItemsApiResponse } from "../types/types";
import thumbLinks from "../utils/thumbLinks";
import { MediaItem } from "./mediaItem";

export function GetSectionItems({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState([]);

  // TODO: Search functionality still not working fix it.

  const endpoint = `${ENDPOINTS.librarySections}${sectionId}/all`;

  const { data, isLoading } = useFetch(endpoint, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  useEffect(() => {
    if (Array.isArray(data)) {
      filterList(
        data.filter(
          (item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) =>
            Array.isArray(item.title) && item.title.some((keyword: string) => keyword.includes(searchText)),
        ),
      );
    }
  }, [searchText, filteredList, data]);

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
      {Array.isArray(data) &&
        data.map((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) => (
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
