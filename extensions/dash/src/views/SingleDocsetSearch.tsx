import { List } from "@raycast/api";
import { useState } from "react";

import { DashResult } from "../components";
import { Docset } from "../types";
import { useDocsetSearch } from "../hooks";

export default function SingleDocsetSearch({
  docset,
  initialSearchString,
}: {
  docset: Docset;
  initialSearchString?: string;
}) {
  const [searchText, setSearchText] = useState(initialSearchString || "");
  const [results, isLoading] = useDocsetSearch(searchText, docset.docsetKeyword);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${docset.docsetName}`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle={`Search in ${docset.docsetName}`}
    >
      {results.map((result, index) => (
        <DashResult result={result} index={index} key={index} />
      ))}
    </List>
  );
}
