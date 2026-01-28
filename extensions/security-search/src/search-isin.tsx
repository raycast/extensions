import { useState } from "react";

import { List, ActionPanel, Action } from "@raycast/api";
import useTradegateSecurities from "./use-search";

export default function SecuritySearch() {
  const [searchText, setSearchText] = useState("");

  const { data, loading, error } = useTradegateSecurities(searchText.trim() || null);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Enter ISIN or search term (e.g., US0378331005 or Apple)..."
      onSearchTextChange={setSearchText}
    >
      {!searchText.trim() ? (
        <List.EmptyView
          title="Enter an ISIN or search term"
          description="Type an ISIN for direct lookup or a company name to search"
        />
      ) : error ? (
        <List.Item title={`Error: ${error}`} />
      ) : !data ? (
        <List.Item title="No results found" />
      ) : data.type === "single" ? (
        <List.Item
          title={data.companyName}
          subtitle={`ISIN: ${data.isin}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Company Name" content={data.companyName} />
              <Action.CopyToClipboard title="Copy Isin" content={data.isin} />
            </ActionPanel>
          }
        />
      ) : data.results.size === 0 ? (
        <List.Item title="No results found" />
      ) : (
        Array.from(data.results.entries()).map(([isin, companyName]) => (
          <List.Item
            key={isin}
            title={companyName}
            subtitle={`ISIN: ${isin}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Isin" content={isin} />
                <Action.CopyToClipboard title="Copy Company Name" content={companyName} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
