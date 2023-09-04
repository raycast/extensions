import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link, Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import CollectionItem from "./components/CollectionItem";
import { CollectionProp, fetchCollections, fetchSearchEngines } from "./utilities/fetch";

interface State {
  links: Link[];
  collections: CollectionProp[];
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

let collectionsResult: CollectionProp[];
fetchCollections().then((res) => {
  collectionsResult = res;
});

export default function SearchResult() {
  const [state, setState] = useState<State>({
    links: [],
    collections: [],
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
        let filteredCollections: CollectionProp[];

        if (!linksResult.length) {
          const searchEngines = await fetchSearchEngines(preferences.api_key);
          if (Array.isArray(searchEngines) && searchEngines.length) {
            linksResult = searchEngines;
            isSearchEngines = true;
          }
        }

        if (preferences.searchCollections) {
          filteredCollections = collectionsResult
            .filter((val) => {
              return looseMatch(searchText, val.heading + " " + val.name);
            })
            .filter((val) => val.count > 0)
            .slice(0, 5);
        } else {
          filteredCollections = [];
        }

        setState({
          links: linksResult,
          collections: filteredCollections,
          isLoading: false,
          isSearchEngines,
        });
      } else {
        setState({
          links: [],
          collections: [],
          isLoading: false,
          isSearchEngines: false,
        });
      }
    };

    searchLinks();
  }, [searchText]);

  let navigationTitle: string;
  let searchBarPlaceholder: string;

  if (preferences.searchCollections) {
    navigationTitle = "Search for Links and Collections";
    searchBarPlaceholder = "Search for links and collections in Anybox";
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
      {state.collections.map((item) => {
        return <CollectionItem item={item} key={item.id} />;
      })}
      {state.links.map((item) => {
        return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
      })}
    </List>
  );
}
