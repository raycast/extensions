import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import type { QmdGetResult } from "./types";
import { parseGetDocument } from "./utils/parsers";
import { runQmdRaw } from "./utils/qmd";

export default function Command() {
  const { isLoading: isDepsLoading, isReady } = useDependencyCheck();
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<QmdGetResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = async (input: string) => {
    if (!input.trim()) {
      setResult(null);
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Auto-detect if it's a docid (starts with #) or path
    const query = input.trim();

    const getResult = await runQmdRaw(["get", query, "--full"]);

    if (getResult.success && getResult.data) {
      // Parse the plain text output using our parser
      const documentResult = parseGetDocument(getResult.data, query);
      setResult(documentResult);
      setSuggestions([]);
    } else {
      setResult(null);
      setSuggestions([]);
      setError(getResult.error || "Document not found");
    }

    setIsLoading(false);
  };

  const handleSelect = (suggestion: string) => {
    setSearchText(suggestion);
    fetchDocument(suggestion);
  };

  if (isDepsLoading) {
    return <List isLoading={true} searchBarPlaceholder="Checking dependencies..." />;
  }

  if (!isReady) {
    return (
      <List>
        <List.EmptyView
          description="Please install the required dependencies to use QMD"
          icon={Icon.Warning}
          title="Dependencies Required"
        />
      </List>
    );
  }

  // If we have a result, show the detail view
  if (result) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.content} title="Copy Content" />
            {result.path && (
              <Action.CopyToClipboard
                content={result.path}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                title="Copy Path"
              />
            )}
            {result.docid && (
              <Action.CopyToClipboard
                content={`#${result.docid}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Document Id"
              />
            )}
            <Action
              icon={Icon.ArrowLeft}
              onAction={() => {
                setResult(null);
                setSearchText("");
              }}
              title="Back to Search"
            />
          </ActionPanel>
        }
        markdown={`# ${result.title || result.path}\n\n${result.content}`}
        metadata={
          <Detail.Metadata>
            {result.path && <Detail.Metadata.Label text={result.path} title="Path" />}
            {result.docid && <Detail.Metadata.Label text={`#${result.docid}`} title="DocID" />}
            {result.collection && <Detail.Metadata.Label text={result.collection} title="Collection" />}
          </Detail.Metadata>
        }
        navigationTitle={result.title || result.path}
      />
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action icon={Icon.Document} onAction={() => fetchDocument(searchText)} title="Get Document" />
        </ActionPanel>
      }
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter path or #docid..."
      searchText={searchText}
    >
      {suggestions.length > 0 && (
        <List.Section title="Did you mean?">
          {suggestions.map((suggestion) => (
            <List.Item
              actions={
                <ActionPanel>
                  <Action icon={Icon.Document} onAction={() => handleSelect(suggestion)} title="Select" />
                </ActionPanel>
              }
              icon={Icon.Document}
              key={suggestion}
              title={suggestion}
            />
          ))}
        </List.Section>
      )}

      {error && !suggestions.length && searchText && (
        <List.EmptyView description={error} icon={Icon.Warning} title="Document Not Found" />
      )}

      {!(searchText || suggestions.length) && (
        <List.EmptyView
          description="Enter a file path or #docid to retrieve a document"
          icon={Icon.Document}
          title="Get Document"
        />
      )}

      {searchText && !suggestions.length && !error && !isLoading && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.Document} onAction={() => fetchDocument(searchText)} title="Get Document" />
            </ActionPanel>
          }
          description={`Search for: ${searchText}`}
          icon={Icon.MagnifyingGlass}
          title="Press Enter to Search"
        />
      )}
    </List>
  );
}
