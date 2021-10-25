import { List, ActionPanel, OpenAction } from "@raycast/api";
import { useState } from "react";
import { Docset } from "./util/docsets";
import { useDocsetSearch } from "./util/useDocsetSearch";

export default function DocsetSearch({ docset }: { docset: Docset }) {
  const [searchText, setSearchText] = useState("");
  const [results, isLoading] = useDocsetSearch(searchText, docset.docsetKeyword);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${docset.docsetName}`}
      onSearchTextChange={setSearchText}
    >
      {results.map((result, i) => (
        <List.Item
          key={result["@_uid"]}
          title={result.title}
          subtitle={result.subtitle[2]}
          icon={result.icon}
          actions={
            <ActionPanel>
              <OpenAction title="Open in Dash" target={`dash-workflow-callback://${i}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
