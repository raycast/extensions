import { List, Grid, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import { FolderProp, fetchSearchEngines } from "./utilities/fetch";

interface State {
  links: Link[];
  isLoading: boolean;
  isSearchEngines: boolean;
}

interface Props {
  folder: FolderProp;
}

export default function SearchFolder(props: Props) {
  const [state, setState] = useState<State>({
    links: [],
    isLoading: true,
    isSearchEngines: false,
  });
  const folder = props.folder;
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences.Search>();

  useEffect(() => {
    const searchLinks = async () => {
      const query: SearchQuery = {
        q: searchText.trim(),
        limit: 50,
        folder: folder.id,
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

  if (preferences.asIcons) {
    return (
      <Grid
        isLoading={state.isLoading}
        enableFiltering={false}
        throttle={true}
        onSearchTextChange={setSearchText}
        navigationTitle={`Search in Folder “${folder.name}”`}
        searchBarPlaceholder={`Search in folder “${folder.name}”`}
      >
        {state.links.map((item) => {
          return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
        })}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={state.isLoading}
        enableFiltering={false}
        throttle={true}
        onSearchTextChange={setSearchText}
        navigationTitle={`Search in Folder “${folder.name}”`}
        searchBarPlaceholder={`Search in folder “${folder.name}”`}
      >
        {state.links.map((item) => {
          return <LinkItem searchText={searchText} isSearchEngine={state.isSearchEngines} item={item} key={item.id} />;
        })}
      </List>
    );
  }
}
