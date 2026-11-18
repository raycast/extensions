import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import type { SearchResult } from "../types";
import { searchInContent } from "../lib/search";
import { useDocument } from "../hooks/useDocuments";
import { getDocumentFilePath } from "../lib/storage";
import { DocumentDetail } from "./DocumentDetail";

interface Props {
  documentId: string;
  content: string;
  initialQuery?: string;
}

export function SearchResults({
  documentId,
  content,
  initialQuery = "",
}: Props) {
  const [searchText, setSearchText] = useState(initialQuery);
  const { document } = useDocument(documentId);
  const prefs = getPreferenceValues<{
    syncFolder?: string;
    defaultEditor?: string;
  }>();

  const results = useMemo(() => {
    if (!searchText.trim()) return [];
    return searchInContent(content, searchText);
  }, [content, searchText]);

  const filePath = document ? getDocumentFilePath(document.filename) : "";

  const openCommand = useMemo(() => {
    if (prefs.defaultEditor) {
      return `open -a "${prefs.defaultEditor}" "${filePath}"`;
    }
    return `open "${filePath}"`;
  }, [prefs.defaultEditor, filePath]);

  const navigationTitle = document ? `Search in "${document.title}"` : "Search";

  return (
    <List
      isLoading={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search in document..."
      navigationTitle={navigationTitle}
    >
      {searchText.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Enter a search term to find matches in the document"
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No matches found"
          description={`No results for "${searchText}"`}
        />
      ) : (
        <List.Section
          title={`${results.length} match${results.length === 1 ? "" : "es"} found`}
        >
          {results.map((result, index) => (
            <SearchResultItem
              key={`${result.lineNumber}-${result.matchStart}-${index}`}
              result={result}
              index={index}
              total={results.length}
              documentId={documentId}
              searchTerm={searchText}
              openCommand={openCommand}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  total: number;
  documentId: string;
  searchTerm: string;
  openCommand: string;
}

function SearchResultItem({
  result,
  index,
  total,
  documentId,
  searchTerm,
  openCommand,
}: SearchResultItemProps) {
  const trimmedLine = result.lineContent.trim();

  return (
    <List.Item
      title={`Line ${result.lineNumber}`}
      subtitle={
        trimmedLine.length > 80 ? trimmedLine.slice(0, 80) + "..." : trimmedLine
      }
      accessories={[{ text: `${index + 1}/${total}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View at Line"
              icon={Icon.Eye}
              target={
                <DocumentDetail
                  documentId={documentId}
                  highlightLine={result.lineNumber}
                  highlightTerm={searchTerm}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Line"
              content={result.lineContent}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Match"
              content={result.lineContent.substring(
                result.matchStart,
                result.matchEnd,
              )}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open">
            <Action
              title="Open in Editor"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                const { exec } = await import("child_process");
                exec(openCommand);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
