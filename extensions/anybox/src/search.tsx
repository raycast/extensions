import { List, Grid, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import TagItem from "./components/TagItem";
import { TagProp, fetchTags as fetchTags, fetchSearchEngines, FolderProp, fetchFolders } from "./utilities/fetch";
import FolderItem from "./components/FolderItem";

interface State {
  links: Link[];
  tags: TagProp[];
  folders: FolderProp[];
  isLoading: boolean;
  isSearchEngines: boolean;
}

function looseMatch(query: string, content: string): boolean {
  if (query.length === 0) {
    return true;
  }
  const keywords = query
    .split(" ")
    .filter((val) => val.length > 0)
    .map((val) => val.toLowerCase());
  const matchName = content.toLowerCase();

  for (const keyword of keywords) {
    if (!matchName.includes(keyword)) {
      return false;
    }
  }

  return true;
}

let tagsResult: TagProp[] = [];
let foldersResult: FolderProp[] = [];
fetchTags().then((res) => {
  if (Array.isArray(res)) {
    tagsResult = res;
  }
});
fetchFolders().then((res) => {
  if (Array.isArray(res)) {
    foldersResult = res;
  }
});

export default function SearchResult() {
  const [state, setState] = useState<State>({
    links: [],
    tags: [],
    folders: [],
    isLoading: true,
    isSearchEngines: false,
  });
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences.Search>();

  useEffect(() => {
    const searchLinks = async () => {
      const query: SearchQuery = {
        q: searchText.trim(),
        limit: 50,
      };
      let limit = 5;
      let isSearchEngines = false;
      let linksResult = await searchRequest(query);

      if (preferences.searchTags && preferences.searchFolders) {
        limit = 3;
      }

      if (preferences.asIcons) {
        limit = 5;
      }

      if (Array.isArray(linksResult)) {
        let filteredTags: TagProp[];
        let filteredFolders: FolderProp[];

        if (!linksResult.length) {
          const searchEngines = await fetchSearchEngines(preferences.api_key);
          if (Array.isArray(searchEngines) && searchEngines.length) {
            linksResult = searchEngines;
            isSearchEngines = true;
          }
        }

        if (preferences.searchTags) {
          filteredTags = tagsResult
            .filter((val) => {
              return looseMatch(searchText, val.name);
            })
            .slice(0, limit);
        } else {
          filteredTags = [];
        }

        if (preferences.searchFolders) {
          filteredFolders = foldersResult
            .filter((val) => {
              return looseMatch(searchText, val.name);
            })
            .slice(0, limit);
        } else {
          filteredFolders = [];
        }

        setState({
          links: linksResult,
          tags: filteredTags,
          folders: filteredFolders,
          isLoading: false,
          isSearchEngines,
        });
      } else {
        setState({
          links: [],
          tags: [],
          folders: [],
          isLoading: false,
          isSearchEngines: false,
        });
      }
    };

    searchLinks();
  }, [searchText]);

  let navigationTitle: string;
  let searchBarPlaceholder: string;

  if (preferences.searchFolders && preferences.searchTags) {
    navigationTitle = "Search for Links, Tags and Folders";
    searchBarPlaceholder = "Search for links, tags and folders in Anybox";
  } else if (preferences.searchFolders) {
    navigationTitle = "Search for Links and Folders";
    searchBarPlaceholder = "Search for links and folders in Anybox";
  } else if (preferences.searchTags) {
    navigationTitle = "Search for Links and Tags";
    searchBarPlaceholder = "Search for links and tags in Anybox";
  } else {
    navigationTitle = "Search for Links";
    searchBarPlaceholder = "Search for links in Anybox";
  }

  let linksSection = null;

  if (!preferences.searchFolders && !preferences.searchTags) {
    linksSection = (
      <>
        {state.links.map((item) => {
          return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
        })}
      </>
    );
  } else {
    linksSection = (
      <List.Section title="Links">
        {state.links.map((item) => {
          return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
        })}
      </List.Section>
    );
  }

  if (preferences.asIcons) {
    return (
      <Grid
        isLoading={state.isLoading}
        filtering={false}
        throttle={true}
        onSearchTextChange={setSearchText}
        navigationTitle={navigationTitle}
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <Grid.Section title="Tags">
          {state.tags.map((item) => {
            return <TagItem item={item} key={item.id} />;
          })}
        </Grid.Section>
        <Grid.Section title="Folders">
          {state.folders.map((item) => {
            return <FolderItem item={item} key={item.id} />;
          })}
        </Grid.Section>
        <Grid.Section title="Links">
          {state.links.map((item) => {
            return (
              <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />
            );
          })}
        </Grid.Section>
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={state.isLoading}
        enableFiltering={false}
        throttle={true}
        onSearchTextChange={setSearchText}
        navigationTitle={navigationTitle}
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <List.Section title="Tags">
          {state.tags.map((item) => {
            return <TagItem item={item} key={item.id} />;
          })}
        </List.Section>
        <List.Section title="Folders">
          {state.folders.map((item) => {
            return <FolderItem item={item} key={item.id} />;
          })}
        </List.Section>
        {linksSection}
      </List>
    );
  }
}
