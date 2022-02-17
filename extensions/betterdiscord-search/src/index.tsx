import { Detail, showToast, Toast, Icon, useNavigation, Action, ActionPanel, List } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";
import { RateLimit } from "async-sema";

const limit = RateLimit(1);

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  icon: string;
  id: string;
  name: string;
  type: string;
  author: string;
  thumb: string;
  url: string;
  downloads: string;
  source: string;
  version: string;
  likes: string;
  description: string;
}

let mainToast: Toast;

async function setToasts() {
  mainToast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding Addons",
    message: "",
  });
}

setToasts();

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      mainToast.style = Toast.Style.Failure;
      mainToast.title = "Failed to Perform Search";
      mainToast.message = `${error}`;
    }
  }

  return {
    state: state,
    search: search,
  };
}

export default function Command() {
  const { push } = useNavigation();
  const { state } = useSearch();
  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search for a BetterDiscord Addon..." throttle>
      <List.Section title="Addons" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );

  function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
    const details = `
# ${searchResult.name}
#### By ${searchResult.author} | Version: ${searchResult.version} | Downloads: ${searchResult.downloads} | Likes: ${searchResult.likes}

${searchResult.description}

<img src="${searchResult.icon}" alt="Thumbnail"/> 
  `;
    mainToast.hide();
    return (
      <List.Item
        title={searchResult.name}
        subtitle={searchResult.author}
        icon={{
          source: searchResult.thumb || Icon.QuestionMark,
          tintColor: "white",
        }}
        accessoryTitle={"↓" + searchResult.downloads}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={searchResult.url} />
            <Action
              title="Details"
              icon={Icon.Text}
              onAction={() => {
                push(<Details searchResult={searchResult} description={details} />);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  function Details(props: { description: string; searchResult: SearchResult }) {
    return <Detail navigationTitle="Details" markdown={props.description} />;
  }
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  await limit();
  const response = await fetch("https://api.betterdiscord.app/v1/store/addons", {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    mainToast.style = Toast.Style.Failure;
    mainToast.title = "Failed To Get Addons";
    mainToast.message = response.statusText as string;
    return Promise.reject(response.statusText);
  }
  type Json = Record<string, any>;

  const json = (await response.json()) as Json;
  return json.map(
    (jsonResult: {
      latest_source_url: any;
      description: any;
      thumbnail_url: any;
      version: any;
      likes: any;
      downloads: any;
      id: any;
      name: any;
      type: any;
      author: { display_name: any };
    }) => {
      const addonName = jsonResult.name;
      const addonType = jsonResult.type;
      const addonAuthor = jsonResult.author.display_name;
      const addonId = jsonResult.id;
      const addonDownloads = jsonResult.downloads;
      const addonVersion = jsonResult.version;
      const addonSource = jsonResult.latest_source_url;
      const addonLikes = jsonResult.likes;
      const addonIcon = "https://betterdiscord.app" + jsonResult.thumbnail_url;
      const addonDescription = jsonResult.description;
      let addonThumbnail;
      if (addonType == "theme") {
        addonThumbnail = "https://i.imgur.com/lolFYyy.png";
      }
      if (addonType == "plugin") {
        addonThumbnail = "https://i.imgur.com/VyY6fhG.png";
      }
      return {
        id: addonId as string,
        name: addonName as string,
        type: addonType as string,
        author: addonAuthor as string,
        thumb: addonThumbnail as string,
        downloads: addonDownloads as string,
        description: addonDescription as string,
        source: addonSource as string,
        version: addonVersion as string,
        likes: addonLikes as string,
        icon: addonIcon as string,
        url: "https://betterdiscord.app/" + (addonType as string) + "?id=" + (addonId as string),
      };
    }
  );
}
