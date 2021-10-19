import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { Docset, getDocsetIconPath, getDocsets } from "./util/docsets";
import DocsetSearch from "./DocsetSearch";

export default function DocSetList() {
  const [docsets, setDocsets] = useState<Docset[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredDocsets, setFilteredDocsets] = useState<Docset[]>([]);

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
      isLoading={docsets.length === 0}
      searchBarPlaceholder="Filter docsets by name or keyword..."
      onSearchTextChange={searchInDocsets}
    >
      {(searchText.length > 0 ? filteredDocsets : docsets).map((docset) => (
        <DocsetListItem key={docset.docsetKeyword} docset={docset} />
      ))}
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
          <ActionPanel.Item title="Open" onAction={() => push(<DocsetSearch docset={docset} />)} />
        </ActionPanel>
      }
    />
  );
}
