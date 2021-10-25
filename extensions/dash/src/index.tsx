import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Docset, getDocsetIconPath, useDocsets } from "./util/docsets";
import SingleDocsetSearch from "./SingleDocsetSearch";
import { useDocsetSearch } from "./util/useDocsetSearch";
import DashResult from "./components/DashResult";

export default function MultiDocsetSearch() {
  const [searchText, setSearchText] = useState("");
  const [docsets, isLoadingDocsets] = useDocsets(searchText);
  const [searchResults, isLoadingSearchResults] = useDocsetSearch(searchText);

  return (
    <List
      isLoading={isLoadingDocsets || isLoadingSearchResults}
      searchBarPlaceholder="Filter docsets by name or keyword..."
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Docsets">
        {docsets.map((docset) => (
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
