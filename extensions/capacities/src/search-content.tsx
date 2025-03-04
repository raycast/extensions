import { List, ActionPanel, getPreferenceValues, showToast, Toast, Icon, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import OpenInCapacities from "./components/OpenInCapacities";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import axios from "axios";
import { API_URL, useCapacitiesStore } from "./helpers/storage";
import { ColorKey, colorValues } from "./helpers/color";
import ErrorView from "./components/ErrorView";

type Space = { title: string; id: string };

type SearchContentResponse = {
  results: {
    id: string;
    spaceId: string;
    structureId: string;
    title: string;
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
      <List.Dropdown.Section title="Spaces">
        <List.Dropdown.Item key="All" title="All spaces" value="all" />
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const cache = new Cache();

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const { store, triggerLoading, error, isLoading: isLoadingStore } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [spaceId, _setSpaceId] = useState<string>(cache.get("searchSpaceId") || "all");
  const [searchText, setSearchText] = useState<string>("");
  const [results, setResults] = useState<SearchContentResponse["results"]>();

  function runSetSpaceId(id: string) {
    _setSpaceId(id);
    cache.set("searchSpaceId", id);
  }

  useEffect(() => {
    if (spaceId !== "all" && store?.spaces && !store?.spaces.find((el) => el.id === spaceId)) {
      runSetSpaceId("all");
    }
  }, [spaceId, store]);

  useEffect(() => {
    searchContent();
  }, [searchText, spaceId]);

  const searchContent = () => {
    const spaceIds = spaceId === "all" ? store?.spaces?.map((el) => el.id) || [] : [spaceId];
    if (!spaceIds.length) return;

    if (!searchText.length) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    axios
      .post<SearchContentResponse>(
        `${API_URL}/search`,
        {
          mode: "title",
          searchTerm: searchText,
          spaceIds: spaceIds,
        },
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${preferences.bearerToken}`,
            "Content-Type": "application/json",
          },
        },
      )
      .then((response) => {
        setResults(response.data.results);
      })
      .catch((error) => {
        showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return error ? (
    <ErrorView error={error} />
  ) : (
    <List
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
        <List.EmptyView title="No results found" icon={Icon.Number00} />
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

            return (
              <List.Item
                key={result.id + index}
                title={result.title}
                accessories={[
                  structureName?.length
                    ? {
                        tag: {
                          value: structureName,
                          color: {
                            light: labelColor === "gray" ? colorData.textLight : colorData.borderLight,
                            dark: labelColor === "gray" ? colorData.textDark : colorData.borderDark,
                            adjustContrast: false,
                          },
                        },
                      }
                    : {},
                  spaceId === "all"
                    ? {
                        tag: {
                          value: store?.spaces.find((space) => space.id === result.spaceId)?.title || "Unknown",
                          color: {
                            light: colorValues["gray"].textLight,
                            dark: colorValues["gray"].textDark,
                            adjustContrast: false,
                          },
                        },
                      }
                    : {},
                ]}
                actions={
                  <ActionPanel>
                    <OpenInCapacities target={`${result.spaceId}/${result.id}`} />
                  </ActionPanel>
                }
              />
            );
          })
      )}
    </List>
  );
}
