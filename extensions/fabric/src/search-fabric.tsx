import { useEffect, useState } from "react";
import { ActionPanel, Action, Image, List, showToast, Toast } from "@raycast/api";
import { withAccessToken, showFailureToast } from "@raycast/utils";

import { getFabricClient, Kind, Resource, SearchQuery, oauthService } from "./api/fabricClient";
import { getKindIcon, removeHtml } from "./utils";
import { URL_APP } from "./config";

const KINDS: [Kind, string][] = [
  [Kind.IMAGE, "Image"],
  [Kind.NOTEPAD, "Note"],
  [Kind.BOOKMARK, "Bookmark"],
  [Kind.HIGHLIGHT, "Highlight"],
  [Kind.DOCUMENT, "Document"],
  [Kind.AUDIO, "Audio"],
  [Kind.VIDEO, "Video"],
  [Kind.FOLDER, "Folder"],
  [Kind.DEFAULT_FILE, "Other file"],
];

interface SearchResult {
  id: string;
  name: string;
  description: string;
  icon: Image.ImageLike;
}

type SearchResponse =
  | {
      status: "success";
      resources: SearchResult[];
    }
  | {
      status: "error";
      error: unknown;
    };

const apiFilter = async (searchQuery: SearchQuery): Promise<SearchResponse> => {
  const fabricClient = getFabricClient();

  let resources: Resource[];
  try {
    resources = await fabricClient.searchResources(searchQuery);
  } catch (error) {
    return {
      status: "error",
      error,
    };
  }

  const resourcesFormatted = resources.map((item) => {
    let name = item.name || "";
    if (name && item.extension) {
      name += `.${item.extension}`;
    }

    let description = "";
    if (item.kind === Kind.NOTEPAD) {
      description = item.data.preview?.content ? removeHtml(item.data.preview.content) : "";
    } else if (item.kind === Kind.BOOKMARK || item.kind === Kind.HIGHLIGHT) {
      description = item.data.webpage?.description || "";
    }

    let icon: Image.ImageLike = getKindIcon(item.kind as Kind);
    if (item.thumbnail) {
      icon = item.thumbnail.sm;
    } else if (item.data?.webpage?.favicon?.url) {
      icon = item.data.webpage.favicon.url;
    }

    return {
      id: item.id,
      name,
      description,
      icon,
    };
  });

  return {
    status: "success",
    resources: resourcesFormatted,
  };
};

function Search() {
  const emptyList: SearchResult[] = [];
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({ text: "" });
  const [filteredList, filterList] = useState(emptyList);

  useEffect(() => {
    let aborted = false;

    setIsLoading(true);
    apiFilter(searchQuery)
      .then((result) => {
        if (aborted) return;

        if (result.status === "error") {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch items: request error",
          });
          return;
        }

        filterList(result.resources);
      })
      .catch((error) => {
        if (aborted) return;

        showFailureToast(error, {
          title: "Failed to fetch items: unknown error",
        });
      })
      .finally(() => {
        if (aborted) return;

        setIsLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [searchQuery]);

  const kindDropdown = (
    <List.Dropdown
      tooltip="Filter Items by Kind"
      onChange={(kind: string) => setSearchQuery({ ...searchQuery, kind: kind as Kind })}
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Any kind" value="" key="" icon={getKindIcon(null)} />
      </List.Dropdown.Section>

      {KINDS.map(([kind, kindTitle]) => (
        <List.Dropdown.Item title={kindTitle} value={kind} key={kind} icon={getKindIcon(kind)} />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      onSearchTextChange={(text: string) => setSearchQuery({ ...searchQuery, text })}
      searchBarAccessory={kindDropdown}
      isLoading={isLoading}
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.name}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${URL_APP}/home?expandedFdocId=${item.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken(oauthService)(Search);
