import { useState } from "react";
import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { useDblp } from "./hooks";
import { Author, searchAuthors } from "./dblp";
import { PublicationList } from "./publications";

export default function SearchAuthors() {
  const [searchText, setSearchText] = useState("");

  const { data: authors, isLoading } = useDblp(
    async (query: string, signal?: AbortSignal) => {
      const trimmed = query.trim();
      if (trimmed.length === 0) return [] as Author[];
      return searchAuthors(trimmed, signal);
    },
    [searchText],
    "Could not search DBLP",
  );

  const hasQuery = searchText.trim().length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search DBLP authors by name…"
      throttle
    >
      {!hasQuery ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search DBLP"
          description="Type an author's name to find their publications."
        />
      ) : (
        <List.Section title="Authors" subtitle={authors ? `${authors.length}` : undefined}>
          {(authors ?? []).map((author) => (
            <AuthorItem key={author.pid} author={author} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AuthorItem({ author }: { author: Author }) {
  const subtitle = author.notes.length > 0 ? author.notes[0] : undefined;

  return (
    <List.Item
      icon={Icon.Person}
      title={author.name}
      subtitle={subtitle}
      accessories={author.notes.length > 1 ? [{ text: `+${author.notes.length - 1}` }] : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Show Publications"
            target={<PublicationList author={author} />}
          />
          <Action
            icon={Icon.Globe}
            title="Open Author Page"
            onAction={() => open(author.url)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Author Page URL"
            content={author.url}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
