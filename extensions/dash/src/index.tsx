import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { Docset, getDocsetIconPath, getDocsets } from "./util/docsets";
import SingleDocsetSearch from "./SingleDocsetSearch";
import { useDocsetSearch } from "./util/useDocsetSearch";
import DashResult from "./components/DashResult";

export default function MultiDocsetSearch() {
  const [docsets, setDocsets] = useState<Docset[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredDocsets, setFilteredDocsets] = useState<Docset[]>([]);
  const [searchResults, isLoadingSearchResults] = useDocsetSearch(searchText);

  useEffect(() => {
    getDocsets().then(setDocsets);
  }, []);

  const searchInDocsets = (newSearchText: string) => {
    setSearchText(newSearchText);

    setFilteredDocsets(
      docsets.filter((docset) =>
        docset.docsetName.toLowerCase().includes(newSearchText.toLowerCase())
        || docset.docsetKeyword.toLowerCase().includes(newSearchText.toLowerCase())
      )
    );
  };

  return (
    <List
      isLoading={docsets.length === 0 || isLoadingSearchResults}
      searchBarPlaceholder="Filter docsets by name or keyword..."
      onSearchTextChange={searchInDocsets}
    >
      <List.Section title="Docsets">
        {(searchText.length > 0 ? filteredDocsets : docsets).map((docset) => (
          <DocsetListItem key={docset.docsetKeyword} docset={docset} />
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
      icon={getDocsetIconPath(docset)}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Open" onAction={() => push(<SingleDocsetSearch docset={docset} />)} />
        </ActionPanel>
      }
    />
  );
}
