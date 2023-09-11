import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import { Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import { TagProp, fetchSearchEngines } from "./utilities/fetch";

interface State {
  links: Link[];
  isLoading: boolean;
  isSearchEngines: boolean;
}

interface Props {
  tag: TagProp;
}

export default function SearchTag(props: Props) {
  const [state, setState] = useState<State>({
    links: [],
    isLoading: true,
    isSearchEngines: false,
  });
  const tag = props.tag;
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const searchLinks = async () => {
      const preferences: Preferences = getPreferenceValues();
      const query: SearchQuery = {
        q: searchText.trim(),
        limit: 50,
        tag: tag.id,
        pinyin: preferences.usePinyin ? "yes" : "no",
      };
      let isSearchEngines = false;
      let linksResult = await searchRequest(query);

      if (Array.isArray(linksResult)) {
        if (!linksResult.length) {
          const searchEngines = await fetchSearchEngines(preferences.api_key);
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
      navigationTitle={`Search in Tag “${tag.name}”`}
      searchBarPlaceholder={`Search in tag “${tag.name}”`}
    >
      {state.links.map((item) => {
        return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
      })}
    </List>
  );
}
