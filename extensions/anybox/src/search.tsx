import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import { Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import CollectionItem from "./components/CollectionItem";
import { CollectionProp, getCollections } from "./utilities/fetch";

interface State {
  links: Link[];
  collections: CollectionProp[];
  isLoading: boolean;
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

let collectionsResult: [CollectionProp];
getCollections().then((res) => {
  collectionsResult = res;
});

export default function SearchResult() {
  const [state, setState] = useState<State>({
    links: [],
    collections: [],
    isLoading: true,
  });
  const [searchText, setSearchText] = useState("");
  const preferences: Preferences = getPreferenceValues();

  useEffect(() => {
    const query: SearchQuery = {
      q: searchText.trim(),
      limit: 30,
      pinyin: preferences.usePinyin ? "yes" : "no",
    };
    searchRequest(query).then((linksReuslt) => {
      if (Array.isArray(linksReuslt)) {
        let filteredCollections: CollectionProp[];

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
          links: linksReuslt,
          collections: filteredCollections,
          isLoading: false,
        });
      } else {
        setState({
          links: [],
          collections: [],
          isLoading: false,
        });
      }
    });
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
        return <LinkItem item={item} key={item.id} />;
      })}
    </List>
  );
}
