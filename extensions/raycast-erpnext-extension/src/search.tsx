import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { erpNextAPI } from "./api";
import { DocumentDetail } from "./document-detail";
import {
  SearchResult,
  getDocTypeFromResult,
  getDocumentName,
  getDisplayLabel,
  getIconForResult,
} from "./utils/search-helpers";

interface SearchArguments {
  query: string;
  doctype?: string;
}

const SEARCH_DEBOUNCE_MS = 500;

export default function Command(props: { arguments: SearchArguments }) {
  const searchQuery = props.arguments?.query || "";
  const doctypeFilter = props.arguments?.doctype || "";

  const [searchText, setSearchText] = useState(searchQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchText.trim()) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const results = await erpNextAPI.globalSearch(searchText, doctypeFilter);

        const processedResults: SearchResult[] = results.map((item) => ({
          value: item.name || item.title || "Unknown",
          label: item.title || item.name || "Unknown",
          description: `${item.doctype}: ${item.content || item.description || ""}`,
          ...item,
        }));

        setSearchResults(processedResults);
        setError(null);
      } catch (error) {
        console.error("Search error:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchSearchResults, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, doctypeFilter]);

  const renderEmptyView = () => {
    if (error) {
      return <List.EmptyView title="Error" description={error} icon={{ source: Icon.Warning, tintColor: Color.Red }} />;
    }

    if (searchText.trim() === "") {
      return (
        <List.EmptyView
          title={doctypeFilter ? `Search ${doctypeFilter}` : "Type to search"}
          description={
            doctypeFilter
              ? `Enter your search query to find ${doctypeFilter} documents`
              : "Enter your search query to find DocTypes, documents, and more"
          }
          icon={Icon.MagnifyingGlass}
        />
      );
    }

    if (searchResults.length === 0 && !isLoading) {
      return (
        <List.EmptyView
          title="No Results Found"
          description={
            doctypeFilter
              ? `No ${doctypeFilter} documents found. Try different keywords.`
              : "Try searching with different keywords"
          }
          icon={Icon.MagnifyingGlass}
        />
      );
    }

    return null;
  };

  const renderSearchResults = () => {
    return searchResults.map((result, index) => {
      const docType = getDocTypeFromResult(result);
      const documentName = getDocumentName(result);
      const displayLabel = getDisplayLabel(result);
      const displayTitle = `[${docType}] ${displayLabel}`;
      const content = result.content?.replaceAll("|||", "|") || result.description || "";

      return (
        <List.Item
          key={`${docType}-${documentName}-${index}`}
          title={displayTitle}
          subtitle={content}
          icon={getIconForResult(result)}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<DocumentDetail doctype={docType} name={documentName} />}
              />
              <Action.OpenInBrowser
                title="Open in Erpnext"
                icon={Icon.Globe}
                url={erpNextAPI.getDocumentURL(docType, documentName)}
              />
              <Action.CopyToClipboard
                title="Copy Document Name"
                content={documentName}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Doctype"
                content={docType}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      );
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={doctypeFilter ? `Search ${doctypeFilter} documents...` : "Search ERPNext..."}
      throttle
    >
      {renderEmptyView() || renderSearchResults()}
    </List>
  );
}
