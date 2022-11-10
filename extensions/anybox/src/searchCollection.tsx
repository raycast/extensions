import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import searchRequest, { SearchQuery, Link } from "./utilities/searchRequest";
import { Preferences } from "./utilities/searchRequest";
import LinkItem from "./components/LinkItem";
import { CollectionProp } from "./utilities/fetch";

interface State {
  links: Link[];
  isLoading: boolean;
}

interface Props {
  collection: CollectionProp;
}

export default function SearchCollection(props: Props) {
  const [state, setState] = useState<State>({
    links: [],
    isLoading: true,
  });
  const collection = props.collection;
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const preferences: Preferences = getPreferenceValues();
    const query: SearchQuery = {
      q: searchText.trim(),
      limit: 30,
      collection: collection.id,
      pinyin: preferences.usePinyin ? "yes" : "no",
    };
    searchRequest(query).then((linksReuslt) => {
      if (Array.isArray(linksReuslt)) {
        setState({
          links: linksReuslt,
          isLoading: false,
        });
      } else {
        setState({
          links: [],
          isLoading: false,
        });
      }
    });
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
        return <LinkItem item={item} key={item.id} />;
      })}
    </List>
  );
}
