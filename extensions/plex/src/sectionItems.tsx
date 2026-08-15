import { Action, ActionPanel, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";
import { IdentityResponse, Metadata, MetadataWithThumb, SectionItemsApiResponse } from "../types/types";
import { ENDPOINTS, plex_token } from "../utils/constants";
import { getSubtitle } from "../utils/subtitle";
import { getImdbUrl, getPlexDeeplink, getThumbLink, getTmdbUrl } from "../utils/links";
import { MediaItem } from "./mediaItem";

export function GetSectionItems({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const [defaultSort, setDefaultSort] = useCachedState("defaultSort", "title:asc");
  const [sort, setSort] = useState(defaultSort);

  const endpoint = `${ENDPOINTS.librarySections}/${sectionId}/all?sort=${sort}`;

  const { data, isLoading } = useFetch<Metadata[], MetadataWithThumb[], MetadataWithThumb[]>(endpoint, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse: parseLibraryResponse,
    mapResult(items) {
      return {
        data: items.map((item) => ({
          ...item,
          thumbUrl: getThumbLink({ thumb: item.thumb }),
        })),
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  const { data: identity } = useFetch(ENDPOINTS.identity, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse: parseIdentityResponse,
    keepPreviousData: true,
  });

  const machineIdentifier = identity?.machineIdentifier;

  function handleDropdownChange(value: string) {
    setSort(value);
  }

  return (
    <Grid
      isLoading={isLoading}
      throttle
      columns={5}
      aspectRatio="2/3"
      filtering
      fit={Grid.Fit.Fill}
      navigationTitle={sectionName}
      searchBarPlaceholder={"Search " + sectionName}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort" defaultValue={defaultSort} onChange={handleDropdownChange}>
          <Grid.Dropdown.Item icon={Icon.Text} title="By Title (↑)" value="title:asc" />
          <Grid.Dropdown.Item icon={Icon.Text} title="By Title (↓)" value="title:desc" />
          <Grid.Dropdown.Item icon={Icon.Calendar} title="By Year (↑)" value="year:asc" />
          <Grid.Dropdown.Item icon={Icon.Calendar} title="By Year (↓)" value="year:desc" />
          <Grid.Dropdown.Item icon={Icon.Plus} title="By Date Added (↑)" value="addedAt:asc" />
          <Grid.Dropdown.Item icon={Icon.Plus} title="By Date Added (↓)" value="addedAt:desc" />
          <Grid.Dropdown.Item icon={Icon.Star} title="By Critic Rating (↓)" value="rating:desc" />
          <Grid.Dropdown.Item icon={Icon.Star} title="By Audience Rating (↓)" value="audienceRating:desc" />
          <Grid.Dropdown.Item icon={Icon.Clock} title="By Duration (↑)" value="duration:asc" />
          <Grid.Dropdown.Item icon={Icon.Clock} title="By Duration (↓)" value="duration:desc" />
          <Grid.Dropdown.Item icon={Icon.CircleProgress} title="By Progress" value="viewOffset:desc" />
          <Grid.Dropdown.Item icon={Icon.ArrowCounterClockwise} title="By Last Watched" value="lastViewedAt:desc" />
          <Grid.Dropdown.Item icon={Icon.QuestionMark} title="By Randomly" value="random" />
        </Grid.Dropdown>
      }
    >
      {data.map((item) => (
        <Grid.Item
          key={item.guid}
          content={{
            source: item.thumbUrl,
          }}
          title={item.title}
          subtitle={getSubtitle(item, sort)}
          keywords={[
            ...(item.Genre?.map((g) => g.tag) ?? []),
            ...(item.Director?.map((d) => d.tag) ?? []),
            ...(item.Role?.map((r) => r.tag) ?? []),
            item.studio,
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Eye}
                title="Show Details"
                target={<MediaItem item={item} machineIdentifier={machineIdentifier} />}
              />
              <Action.OpenInBrowser
                icon={Icon.Play}
                url={getPlexDeeplink(item.key, machineIdentifier)}
                title="Open in Plex"
              />
              <Action.OpenInBrowser icon={Icon.MagnifyingGlass} url={getImdbUrl(item.title)} title="Search on IMDB" />
              <Action.OpenInBrowser icon={Icon.MagnifyingGlass} url={getTmdbUrl(item.title)} title="Search on TMDB" />
              <Action
                icon={Icon.Pin}
                title="Set Current Sort as Default"
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => {
                  setDefaultSort(sort);
                  showToast({ style: Toast.Style.Success, title: "Default sort saved" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

async function parseLibraryResponse(response: Response): Promise<Metadata[]> {
  const json = (await response.json()) as SectionItemsApiResponse;

  if (!response.ok || !json.MediaContainer || !json.MediaContainer.Metadata) {
    throw new Error("Error in response.");
  }

  return json.MediaContainer.Metadata;
}

async function parseIdentityResponse(response: Response): Promise<IdentityResponse["MediaContainer"]> {
  const json = (await response.json()) as IdentityResponse;

  if (!response.ok || !json.MediaContainer) {
    throw new Error("Error fetching server identity.");
  }

  return json.MediaContainer;
}
