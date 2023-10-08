import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import DashResult from "../components/DashResult";
import { useDocsets, useDocsetSearch } from "../hooks";
import SingleDocsetSearch from "./SingleDocsetSearch";
import { DashArguments, Docset } from "../types";
import useDashApp from "../hooks/useDashApp";
import { getFilteredDocsets } from "../utils";
import OpenInBrowserAction from "../components/OpenInBrowserAction";

export default function MultiDocsetSearch(props: { arguments?: DashArguments }) {
  const [searchText, setSearchText] = useState(props.arguments?.searchstring || "");
  const [dashApp, isDashAppLoading] = useDashApp();
  const [docsets, isLoadingDocsets] = useDocsets();
  const [searchResults, isLoadingSearchResults] = useDocsetSearch(searchText);
  const filteredDocsets = getFilteredDocsets(docsets, searchText);
  const docsetKeywords = docsets.map((item) => item.docsetKeyword);

  if (!isDashAppLoading && !dashApp) {
    return (
      <List>
        <List.EmptyView
          title="Dash.app not found"
          description="You need to have Dash installed to use this extension."
          icon="empty-view-icon.png"
          actions={
            <ActionPanel>
              <OpenInBrowserAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

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
