import { ActionPanel, Action, Grid } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import React from "react";
import { useState, useEffect } from "react";
import { ENDPOINTS, plex_token } from "../utils/constants";
import { SectionItemsApiResponse } from "../types/types";
import thumbLinks from "../utils/thumbLinks";
import { MediaItem } from "./mediaItem";

export function GetSectionItems({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const [searchText, setSearchText] = useState<string>("");
  const [filteredList, setFilteredList] = useState<SectionItemsApiResponse["MediaContainer"]["Metadata"][]>([]);

  const endpoint = `${ENDPOINTS.librarySections}${sectionId}/all`;

  const { data, isLoading } = useFetch(endpoint, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isLoading && Array.isArray(data)) {
      setFilteredList(data);
    }
  }, [isLoading, data]);

  useEffect(() => {
    if (Array.isArray(data)) {
      if (searchText.length > 0) {
        setFilteredList(
          filteredList.filter((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) =>
            item.title.toLowerCase().includes(searchText.toLowerCase()),
          ),
        );
      } else if (searchText.length === 0) {
        setFilteredList(data);
      }
    }
  }, [searchText]);

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
      {Array.isArray(filteredList) &&
        filteredList.map((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) => (
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
