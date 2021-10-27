import { List } from "@raycast/api";
import { useState } from "react";
import DashResult from "./components/DashResult";
import { Docset } from "./util/docsets";
import { useDocsetSearch } from "./util/useDocsetSearch";

export default function SingleDocsetSearch({ docset }: { docset: Docset }) {
  const [searchText, setSearchText] = useState("");
  const [results, isLoading] = useDocsetSearch(searchText, docset.docsetKeyword);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${docset.docsetName}`}
      onSearchTextChange={setSearchText}
    >
      {results.map((result, index) => (
        <DashResult result={result} index={index} key={index} />
      ))}
    </List>
  );
}
