import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import React from "react";
import { ENDPOINTS, plex_token } from "../utils/constants";
import { SectionItemsApiResponse } from "../types/types";
import calculateTime from "../utils/timeCalculator";

export function GetSectionItems({ sectionId }: { sectionId: string }) {
  const endpoint = `${ENDPOINTS.librarySections}${sectionId}/all`;

  const { data, isLoading } = useFetch(endpoint, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search..." throttle>
      {Array.isArray(data) &&
        data.map((item: SectionItemsApiResponse["MediaContainer"]["Metadata"]) => (
          <SectionItem key={item.title} sectionItem={item} />
        ))}
    </List>
  );
}

function SectionItem({ sectionItem }: { sectionItem: SectionItemsApiResponse["MediaContainer"]["Metadata"] }) {
  const markdown = `
|Title| ${sectionItem.title} |
|--|--|
| Summary | ${sectionItem.summary} |

`;

  return (
    <List.Item
      icon={"🍿"}
      title={sectionItem.title}
      subtitle={sectionItem.year.toString()}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {sectionItem.year && <List.Item.Detail.Metadata.Label title="Year" text={sectionItem.year.toString()} />}

              {sectionItem.tagline && <List.Item.Detail.Metadata.Label title="Tagline" text={sectionItem.tagline} />}

              {sectionItem.contentRating && (
                <List.Item.Detail.Metadata.Label title="Content Rating" text={sectionItem.contentRating} />
              )}

              {sectionItem.rating && (
                <List.Item.Detail.Metadata.Label title="Rating" text={sectionItem.rating.toString()} />
              )}

              {sectionItem.audienceRating && (
                <List.Item.Detail.Metadata.Label title="Audience Rating" text={sectionItem.audienceRating.toString()} />
              )}

              {sectionItem.studio && <List.Item.Detail.Metadata.Label title="Studio" text={sectionItem.studio} />}

              {sectionItem.duration && (
                <List.Item.Detail.Metadata.Label title="Duration" text={calculateTime(sectionItem.duration)} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in IMDB"
            url={"https://www.imdb.com/find/?q=" + sectionItem.title.toString()}
          />
        </ActionPanel>
      }
    />
  );
}

async function parseResponse(response: Response): Promise<SectionItemsApiResponse["MediaContainer"]["Metadata"]> {
  const json = (await response.json()) as SectionItemsApiResponse;

  if (!response.ok || !json.MediaContainer || !json.MediaContainer.Metadata) {
    throw new Error("Error in response.");
  }

  return json.MediaContainer.Metadata;
}
