import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { type NoteSearchResult, searchNotes } from "./api";
import { ErrorState, noteSnippetMarkdown, openNocalDeepLink } from "./components";

function cleanText(value: string | null | undefined) {
  return noteSnippetMarkdown(value).replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function noteListTitle(result: NoteSearchResult) {
  return cleanText(result.title_snippet || result.note.title || "Untitled");
}

function noteListSubtitle(result: NoteSearchResult) {
  const snippet = cleanText(result.content_snippet);

  if (snippet && snippet !== "No preview available.") {
    return truncate(snippet, 90);
  }

  return "";
}

function formatNoteType(type: string) {
  switch (type.toUpperCase()) {
    case "ADHOC":
      return "Ad-Hoc Note";
    case "EVENT":
      return "Meeting Note";
    case "WEEKLY":
      return "Weekly Note";
    default:
      return type;
  }
}

function notePreviewMarkdown(result: NoteSearchResult) {
  const title = noteListTitle(result);
  const snippet = cleanText(result.content_snippet);
  const sections = [`# ${title}`];
  const breadcrumbs = result.note.folder_breadcrumbs.map((b) => b.name).join(" / ");

  if (breadcrumbs) {
    sections.push("", `_${breadcrumbs}_`);
  }

  if (snippet && snippet !== "No preview available.") {
    sections.push("", snippet);
  } else {
    sections.push("", "_No preview available._");
  }

  return sections.join("\n");
}

export default function SearchNotesCommand() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (searchText.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await searchNotes(searchText.trim());
        setResults(response.results);
      } catch (newError) {
        setError(newError);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your nocal notes..."
    >
      {error ? <ErrorState title="Couldn’t Load Notes" error={error} /> : null}
      {!error && searchText.trim().length < 2 ? (
        <List.EmptyView title="Search Notes" description="Type at least 2 characters to search your notes." />
      ) : null}
      {!error && !isLoading && searchText.trim().length >= 2 && results.length === 0 ? (
        <List.EmptyView title="No Matching Notes" description="Try a different search term." />
      ) : null}
      {results.map((result) => (
        <List.Item
          key={result.note.id}
          icon={Icon.Document}
          title={noteListTitle(result)}
          subtitle={noteListSubtitle(result)}
          detail={
            <List.Item.Detail
              markdown={notePreviewMarkdown(result)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Type" text={formatNoteType(result.note.type)} />
                  <List.Item.Detail.Metadata.Label title="Title" text={result.note.title || "Untitled"} />
                  <List.Item.Detail.Metadata.Label
                    title="Last Modified"
                    text={new Date(result.note.last_modified_date).toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Created"
                    text={new Date(result.note.creation_date).toLocaleString()}
                  />
                  {result.note.folder_breadcrumbs.length ? (
                    <List.Item.Detail.Metadata.Label
                      title="Folder"
                      text={result.note.folder_breadcrumbs.map((b) => b.name).join(" / ")}
                    />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Open in nocal" onAction={() => openNocalDeepLink(`note?id=${result.note.id}`)} />
              <Action.CopyToClipboard title="Copy Note ID" content={result.note.id} />
              <Action title="Open Notes View" onAction={() => openNocalDeepLink("notes")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
