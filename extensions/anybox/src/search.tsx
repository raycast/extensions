import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link, Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import TagItem from "./components/TagItem";
import { TagProp, fetchTags as fetchTags, fetchSearchEngines } from "./utilities/fetch";

interface State {
  links: Link[];
  tags: TagProp[];
  isLoading: boolean;
  isSearchEngines: boolean;
}

function looseMatch(query: string, content: string): boolean {
  if (query.length === 0) {
    return true;
  }
  const keywords = query.split(" ").filter((val) => val.length > 0);
  const matchName = content.toLowerCase();

  for (const keyword of keywords) {
    if (!matchName.includes(keyword)) {
      return false;
    }
  }

  return true;
}

let tagsResult: TagProp[];
fetchTags().then((res) => {
  tagsResult = res;
});

export default function SearchResult() {
  const [state, setState] = useState<State>({
    links: [],
    tags: [],
    isLoading: true,
    isSearchEngines: false,
  });
  const [searchText, setSearchText] = useState("");
  const preferences: Preferences = getPreferenceValues();

  useEffect(() => {
    const searchLinks = async () => {
      const query: SearchQuery = {
        q: searchText.trim(),
        limit: 50,
        pinyin: preferences.usePinyin ? "yes" : "no",
      };
      let isSearchEngines = false;
      let linksResult = await searchRequest(query);

      if (Array.isArray(linksResult)) {
        let filteredTags: TagProp[];

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
            .slice(0, 5);
        } else {
          filteredTags = [];
        }

        setState({
          links: linksResult,
          tags: filteredTags,
          isLoading: false,
          isSearchEngines,
        });
      } else {
        setState({
          links: [],
          tags: [],
          isLoading: false,
          isSearchEngines: false,
        });
      }
    };

    searchLinks();
  }, [searchText]);

  let navigationTitle: string;
  let searchBarPlaceholder: string;

  if (preferences.searchTags) {
    navigationTitle = "Search for Links and Tags";
    searchBarPlaceholder = "Search for links and tags in Anybox";
  } else {
    navigationTitle = "Search for Links";
    searchBarPlaceholder = "Search for links in Anybox";
  }

  return (
    <List
      isLoading={state.isLoading}
      enableFiltering={false}
      throttle={true}
      onSearchTextChange={setSearchText}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
    >
      {state.tags.map((item) => {
        return <TagItem item={item} key={item.id} />;
      })}
      {state.links.map((item) => {
        return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
      })}
    </List>
  );
}
