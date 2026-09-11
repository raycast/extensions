import { List, ActionPanel, Icon, Cache, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import OpenInCapacities from "./components/OpenInCapacities";
import { API_HEADERS, API_URL, handleAPIError, handleUnexpectedError, useCapacitiesStore } from "./helpers/storage";
import { ColorKey, colorValues } from "./helpers/color";
import { usePromise } from "@raycast/utils";

type Space = { title: string; id: string };

type SearchContentResponse = {
  results: {
    id: string;
    spaceId: string;
    structureId: string;
    title: string;
    highlights?: {
      context?: {
        field: "title" | undefined;
      };
      snippets?: string[];
    }[];
  }[];
};

enum ContentType {
  RootSpace = "Space",
  RootDatabase = "Collection",
  RootQuery = "Query",
  RootPage = "Page",
  MediaImage = "Image",
  MediaPDF = "PDF",
  MediaAudio = "Audio",
  MediaVideo = "Video",
  MediaWebResource = "Weblink",
  MediaFile = "File",
  MediaTweet = "Tweet",
  RootAIChat = "AI Chat",
  RootSimpleTable = "Table",
  RootDailyNote = "Daily Note",
  RootTag = "Tag",
  RootStructure = "Object type",
}

function SpaceDropdown({
  value,
  spaces,
  onSpaceChange,
}: {
  value: string;
  spaces: Space[];
  onSpaceChange: (newValue: string) => void;
}) {
  return (
    <List.Dropdown
      value={value}
      tooltip="Select Space"
      onChange={(newValue) => {
        onSpaceChange(newValue);
      }}
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item key="All" title="All spaces" value="all" icon={Icon.List} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Spaces">
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} icon={Icon.Desktop} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const cache = new Cache();

export default function Command() {
  const { store, triggerLoading, isLoading: isLoadingStore } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const [spaceId, _setSpaceId] = useState<string>(cache.get("searchSpaceId") || "all");
  const [searchText, setSearchText] = useState<string>("");

  function runSetSpaceId(id: string) {
    _setSpaceId(id);
    cache.set("searchSpaceId", id);
  }

  useEffect(() => {
    if (spaceId !== "all" && store?.spaces && !store?.spaces.find((el) => el.id === spaceId)) {
      runSetSpaceId("all");
    }
  }, [spaceId, store]);

  const { isLoading, data: results } = usePromise(
    async (searchText, spaceId) => {
      try {
        const spaceIds = spaceId === "all" ? store?.spaces?.map((el) => el.id) || [] : [spaceId];
        if (!searchText.length || !spaceIds.length) return [];
        const response = await fetch(`${API_URL}/search`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            mode: "fullText",
            searchTerm: searchText,
            spaceIds: spaceIds,
          }),
        });
        if (!response.ok) {
          handleAPIError(response);
          return [];
        }
        const result = (await response.json()) as SearchContentResponse;
        return result.results;
      } catch (e) {
        if (e instanceof Error) {
          handleUnexpectedError(e);
        } else {
          console.log(e);
        }
      }
    },
    [searchText, spaceId],
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading || isLoadingStore}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        store && store.spaces.length > 1 ? (
          <SpaceDropdown spaces={store.spaces} onSpaceChange={runSetSpaceId} value={spaceId} />
        ) : null
      }
    >
      {searchText.trim() === "" ? (
        <List.EmptyView title="Type something to get started" />
      ) : !results || results.length === 0 ? (
        <List.EmptyView title="No results found" icon={Icon.MagnifyingGlass} />
      ) : (
        results
          .filter((result) => result.title)
          .map((result, index) => {
            const structureInfo = store?.spacesInfo[result.spaceId]?.structures?.find(
              (el) => el.id === result.structureId,
            );
            let structureName = structureInfo?.title;
            if (!structureName?.length) {
              structureName = ContentType[result.structureId as keyof typeof ContentType];
            }

            let labelColor = (structureInfo?.labelColor as ColorKey | undefined) || "gray";
            let colorData = colorValues[labelColor];
            if (!colorData) {
              labelColor = "gray";
              colorData = colorValues["gray"];
            }

            let mdTitle = result.highlights
              ?.find((highlight) => highlight.context?.field === "title")
              ?.snippets?.join(" ")
              .replace(/<b>|<\/b>/g, "**")
              .trim();
            if (!mdTitle?.length) {
              mdTitle = result.title;
            }
            if (!mdTitle?.length) {
              mdTitle = "Untitled";
            }
            mdTitle = `## ${mdTitle}\n\n`;

            const allSnippets = result.highlights
              ?.filter((highlight) => highlight.context?.field !== "title")
              ?.flatMap((highlight) => highlight.snippets || []);
            const allSnippetsString = allSnippets
              ?.join("\n\n")
              .replace(/<b>|<\/b>/g, "**")
              .trim();

            const mdDetails = mdTitle + allSnippetsString;

            return (
              <List.Item
                key={result.id + index}
                title={result.title}
                detail={
                  <List.Item.Detail
                    markdown={mdDetails}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {structureName?.length ? (
                          <List.Item.Detail.Metadata.TagList title="Type">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={structureName}
                              color={labelColor === "gray" ? colorData.textLight : colorData.borderLight}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        ) : null}
                        {spaceId === "all" ? (
                          <List.Item.Detail.Metadata.TagList title="Space">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={store?.spaces.find((space) => space.id === result.spaceId)?.title || "Unknown"}
                              color={colorValues["gray"].textLight}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <OpenInCapacities target={`${result.spaceId}/${result.id}`} />
                    <Action.CopyToClipboard content={mdDetails} title="Copy Content" />
                  </ActionPanel>
                }
              />
            );
          })
      )}
    </List>
  );
}
