import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import { Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import { CollectionProp, fetchSearchEngines } from "./utilities/fetch";

interface State {
  links: Link[];
  isLoading: boolean;
  isSearchEngines: boolean;
}

interface Props {
  collection: CollectionProp;
}

export default function SearchCollection(props: Props) {
  const [state, setState] = useState<State>({
    links: [],
    isLoading: true,
    isSearchEngines: false,
  });
  const collection = props.collection;
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const searchLinks = async () => {
      const preferences: Preferences = getPreferenceValues();
      const query: SearchQuery = {
        q: searchText.trim(),
        limit: 50,
        collection: collection.id,
        pinyin: preferences.usePinyin ? "yes" : "no",
      };
      let isSearchEngines = false;
      let linksResult = await searchRequest(query);

      if (Array.isArray(linksResult)) {
        if (!linksResult.length) {
          const searchEngines = await fetchSearchEngines();
          if (Array.isArray(searchEngines) && searchEngines.length) {
            linksResult = searchEngines;
            isSearchEngines = true;
          }
        }

        setState({
          links: linksResult,
          isLoading: false,
          isSearchEngines,
        });
      } else {
        setState({
          links: [],
          isLoading: false,
          isSearchEngines: false,
        });
      }
    };
    searchLinks();
  }, [searchText]);

  return (
    <List
      isLoading={state.isLoading}
      enableFiltering={false}
      throttle={true}
      onSearchTextChange={setSearchText}
      navigationTitle={`Search in Collection ${collection.name}`}
      searchBarPlaceholder={`Search for Links in Collection ${collection.name}`}
    >
      {state.links.map((item) => {
        return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
      })}
    </List>
  );
}
