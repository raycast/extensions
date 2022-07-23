import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import DashResult from "../components/DashResult";
import { useDocsets, useDocsetSearch } from "../hooks";
import SingleDocsetSearch from "./SingleDocsetSearch";
import { Docset } from "../types";

const getFilteredDocsets = (docsets: Docset[], searchText: string) =>
  docsets.filter(
    (docset) =>
      docset.docsetName.toLowerCase().includes(searchText.toLowerCase()) ||
      docset.docsetKeyword.toLowerCase().includes(searchText.toLowerCase())
  );

export default function MultiDocsetSearch() {
  const [searchText, setSearchText] = useState("");
  const [docsets, isLoadingDocsets] = useDocsets();
  const [searchResults, isLoadingSearchResults] = useDocsetSearch(searchText);
  const filteredDocsets = getFilteredDocsets(docsets, searchText);
  const docsetKeywords = docsets.map((item) => item.docsetKeyword);

  return (
    <List
      isLoading={isLoadingDocsets || isLoadingSearchResults}
      searchBarPlaceholder="Filter docsets by name or keyword..."
      onSearchTextChange={(newValue) => {
        const setKeywordRegex = /(^\w+) /;
        const setKeyword = setKeywordRegex.test(newValue) && newValue.match(setKeywordRegex)?.[1];
        const isSetKeyWord = docsetKeywords.includes(setKeyword || "");
        const formattedNewValue = isSetKeyWord ? newValue.replace(setKeywordRegex, "$1:") : newValue;
        setSearchText(formattedNewValue.trim());
      }}
    >
      <List.Section title="Docsets">
        {filteredDocsets.map((docset) => (
          <DocsetListItem key={docset.docsetPath} docset={docset} />
        ))}
      </List.Section>
      <List.Section title="Search Results">
        {searchResults.map((result, index) => (
          <DashResult result={result} index={index} key={index} />
        ))}
      </List.Section>
    </List>
  );
}

function DocsetListItem({ docset }: { docset: Docset }) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={docset.docsetName}
      subtitle={docset.docsetKeyword}
      icon={docset.iconPath}
      actions={
        <ActionPanel>
          <Action title="Open" onAction={() => push(<SingleDocsetSearch docset={docset} />)} />
        </ActionPanel>
      }
    />
  );
}
