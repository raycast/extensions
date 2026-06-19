import { List, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { useDocuments, useDocumentByShortcut } from "./hooks/useDocuments";
import { parseShortcutQuery } from "./lib/shortcuts";
import { searchInContent } from "./lib/search";
import { readDocumentContent, getDocumentFilePath } from "./lib/storage";
import { DocumentDetail } from "./components/DocumentDetail";
import { SearchResults } from "./components/SearchResults";

interface Arguments {
  query?: string;
}

export default function QuickSearch(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const initialQuery = props.arguments?.query || "";
  const [searchText, setSearchText] = useState(initialQuery);

  const parsed = useMemo(() => parseShortcutQuery(searchText), [searchText]);

  // If we have a shortcut prefix, show search results for that document
  if (parsed) {
    return (
      <ShortcutSearch
        prefix={parsed.prefix}
        searchTerm={parsed.searchTerm}
        fullQuery={searchText}
        onSearchChange={setSearchText}
      />
    );
  }

  // Otherwise, show document list with filter
  return (
    <DocumentList searchText={searchText} onSearchChange={setSearchText} />
  );
}

interface ShortcutSearchProps {
  prefix: string;
  searchTerm: string;
  fullQuery: string;
  onSearchChange: (text: string) => void;
}

function ShortcutSearch({
  prefix,
  searchTerm,
  fullQuery,
  onSearchChange,
}: ShortcutSearchProps) {
  const { document, content, isLoading } = useDocumentByShortcut(prefix);

  const results = useMemo(() => {
    if (!searchTerm.trim() || !content) return [];
    return searchInContent(content, searchTerm);
  }, [content, searchTerm]);

  if (isLoading) {
    return (
      <List
        isLoading={true}
        searchText={fullQuery}
        onSearchTextChange={onSearchChange}
        searchBarPlaceholder="prefix: search term"
      />
    );
  }

  if (!document) {
    return (
      <List
        searchText={fullQuery}
        onSearchTextChange={onSearchChange}
        searchBarPlaceholder="prefix: search term"
      >
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={`No document found with shortcut "${prefix}"`}
          description="Create a document and assign this shortcut to use it"
        />
      </List>
    );
  }

  const filePath = getDocumentFilePath(document.filename);

  return (
    <List
      searchText={fullQuery}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={`${prefix}: search term`}
      navigationTitle={`Search in "${document.title}"`}
    >
      {!searchTerm.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Searching in "${document.title}"`}
          description={`Type after "${prefix}:" to search`}
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No matches found"
          description={`No results for "${searchTerm}" in "${document.title}"`}
        />
      ) : (
        <List.Section
          title={`${results.length} match${results.length === 1 ? "" : "es"} in "${document.title}"`}
        >
          {results.map((result, index) => (
            <List.Item
              key={`${result.lineNumber}-${result.matchStart}-${index}`}
              title={`Line ${result.lineNumber}`}
              subtitle={
                result.lineContent.trim().length > 80
                  ? result.lineContent.trim().slice(0, 80) + "..."
                  : result.lineContent.trim()
              }
              accessories={[{ text: `${index + 1}/${results.length}` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="View">
                    <Action.Push
                      title="View at Line"
                      icon={Icon.Eye}
                      target={
                        <DocumentDetail
                          documentId={document.id}
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
                  <ActionPanel.Section title="File">
                    <Action.ShowInFinder path={filePath} />
                    <Action.OpenWith path={filePath} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface DocumentListProps {
  searchText: string;
  onSearchChange: (text: string) => void;
}

function DocumentList({ searchText, onSearchChange }: DocumentListProps) {
  const { documents, isLoading } = useDocuments();
  const [documentContents, setDocumentContents] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    async function loadContents() {
      const contents: Record<string, string> = {};
      for (const doc of documents) {
        contents[doc.id] = await readDocumentContent(doc.filename);
      }
      setDocumentContents(contents);
    }
    if (documents.length > 0) {
      loadContents();
    }
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (!searchText.trim()) return documents;

    const query = searchText.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (doc.shortcut && doc.shortcut.toLowerCase().includes(query)),
    );
  }, [documents, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="prefix: search term  OR  filter documents"
    >
      {filteredDocs.length === 0 && searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching documents"
          description={`Try using a shortcut like "prefix: term" to search within a document`}
        />
      ) : filteredDocs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No documents yet"
          description="Create a document first to use quick search"
        />
      ) : (
        <List.Section
          title="Documents"
          subtitle={`Type "shortcut:" to search within a document`}
        >
          {filteredDocs.map((doc) => (
            <List.Item
              key={doc.id}
              title={doc.title}
              subtitle={doc.tags.join(", ")}
              accessories={doc.shortcut ? [{ tag: `${doc.shortcut}:` }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Document"
                    icon={Icon.Eye}
                    target={<DocumentDetail documentId={doc.id} />}
                  />
                  <Action.Push
                    title="Search in Document"
                    icon={Icon.MagnifyingGlass}
                    target={
                      <SearchResults
                        documentId={doc.id}
                        content={documentContents[doc.id] || ""}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
