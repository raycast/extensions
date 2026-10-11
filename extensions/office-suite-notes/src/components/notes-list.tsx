import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { listNotes, searchNotes } from "../lib/api";
import { cleanHighlight } from "../lib/api-core";
import { NoteDetail } from "./note-detail";
import { NoteForm } from "./note-form";
import { SettingsAction } from "./settings-action";

export function NotesList({ folder, title = "Search Notes" }: { folder?: string; title?: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, revalidate } = usePromise(
    async (q: string, currentPage: number, folderId: string | undefined) =>
      q.trim() ? searchNotes(q, folderId) : listNotes(currentPage, folderId),
    [search, page, folder],
  );
  const notes = data?.data ?? [];
  const total = data?.meta?.total ?? notes.length;
  const common = (
    <>
      <Action.Push
        title="Create Note"
        icon={Icon.Plus}
        target={<NoteForm folder={folder} onSaved={revalidate} />}
        shortcut={Keyboard.Shortcut.Common.New}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      {!search.trim() && page > 1 && (
        <Action
          title="Previous Page"
          icon={Icon.ArrowLeft}
          onAction={() => setPage(page - 1)}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
        />
      )}
      {!search.trim() && page * 50 < total && (
        <Action
          title="Next Page"
          icon={Icon.ArrowRight}
          onAction={() => setPage(page + 1)}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
        />
      )}
      <SettingsAction />
    </>
  );
  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchText={search}
      onSearchTextChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      throttle
      filtering={false}
      searchBarPlaceholder="Search titles and content…"
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Document}
        title={error ? "Unable to Load Notes" : "No Notes Found"}
        description={error?.message ?? "Try another search or create a note."}
        actions={<ActionPanel>{common}</ActionPanel>}
      />
      <List.Section
        title={search.trim() ? `${notes.length} shown · ${total} matches` : `Page ${page} · ${total} notes`}
        subtitle={search.trim() && total > notes.length ? "API search limit reached — narrow your query" : undefined}
      >
        {notes.map((note) => (
          <List.Item
            key={note.id}
            icon={Icon.Document}
            title={cleanHighlight(note.title)}
            subtitle={note.snippet ? cleanHighlight(note.snippet).replace(/<[^>]*>/g, "") : undefined}
            accessories={note.updated ? [{ text: note.updated.slice(0, 10) }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Read Note" icon={Icon.Document} target={<NoteDetail id={note.id} />} />
                <Action.CopyToClipboard
                  title="Copy Note ID"
                  content={note.id}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
