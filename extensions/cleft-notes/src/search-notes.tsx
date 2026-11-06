import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { LibraryProblem } from "./components/library-problem";
import { NoteActions } from "./components/note";
import {
  CleftNote,
  DateGroup,
  dateGroup,
  matchSnippet,
  searchNotes,
} from "./lib/notes";
import { useLibrary } from "./lib/use-library";

export default function Command() {
  const { library, error, isLoading, refresh } = useLibrary();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  if (error) return <LibraryProblem error={error} onRetry={refresh} />;
  const notes = library?.notes ?? [];
  if (!isLoading && !notes.length && (library?.skipped || library?.limited)) {
    return (
      <LibraryProblem
        error={
          new Error(
            "The selected folder could not be fully read. Some entries were unreadable, oversized, or outside the search limits, so this scan cannot confirm that no Cleft exports exist. Check the selected folder and retry.",
          )
        }
        onRetry={refresh}
      />
    );
  }
  const matches = searchNotes(notes, query, tag);
  const tags = Array.from(new Set(notes.flatMap((note) => note.tags))).sort(
    (a, b) => a.localeCompare(b),
  );
  const subtitle = `${matches.length} matches${matches.length > 200 ? "; showing first 200, refine your search" : ""}${library?.skipped ? `; ${library.skipped} unreadable or oversized files skipped` : ""}${library?.limited ? "; folder exceeds search limits" : ""}`;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && matches.length > 0}
      navigationTitle={`Cleft Notes · ${subtitle}`}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles, summaries, transcripts, and tags…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
          <List.Dropdown.Item title="All Tags" value="" />
          {tags.map((value) => (
            <List.Dropdown.Item title={value} value={value} key={value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={notes.length ? "No Matching Notes" : "No Cleft Exports Found"}
        description={
          notes.length
            ? "Try a shorter phrase or another tag."
            : "Use Save existing notes as files in Cleft Local Sync settings, then refresh."
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh Notes"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            <Action.OpenInBrowser
              title="Read Local Sync Guide"
              url="https://learn.cleftnotes.com/user-guides/integrations/local-sync/overview"
            />
          </ActionPanel>
        }
      />
      {(
        [
          "Today",
          "Yesterday",
          "This Week",
          "This Month",
          "Older",
        ] as DateGroup[]
      ).map((group, groupIndex) => {
        const shown = matches
          .slice(0, 200)
          .filter((note) => dateGroup(note.created) === group);
        if (!shown.length) return null;
        return (
          <List.Section
            key={group}
            title={group}
            subtitle={groupIndex === 0 || !query ? undefined : subtitle}
          >
            {shown.map((note) => (
              <NoteItem
                key={note.path}
                note={note}
                query={query}
                showDetail={showDetail}
                toggleDetail={() => setShowDetail((value) => !value)}
                refresh={refresh}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function NoteItem({
  note,
  query,
  showDetail,
  toggleDetail,
  refresh,
}: {
  note: CleftNote;
  query: string;
  showDetail: boolean;
  toggleDetail: () => void;
  refresh: () => void;
}) {
  const snippet = query.trim()
    ? matchSnippet(`${note.summary}\n${note.transcript}`, query)
    : undefined;
  const markdown = [
    `## ${note.title}`,
    snippet ? `> 🔎 ${snippet}` : "",
    note.summary || "_No summary in this export._",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item
      title={note.title}
      subtitle={
        showDetail ? undefined : note.tags.map((value) => `#${value}`).join(" ")
      }
      icon={note.audioPath ? Icon.Microphone : Icon.Document}
      keywords={note.tags}
      accessories={
        showDetail ? undefined : [{ date: note.created, tooltip: "Created" }]
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={note.created.toLocaleString()}
              />
              {note.tags.length ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {note.tags.map((value) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={value}
                      text={value}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Transcript"
                text={
                  note.transcript
                    ? `${note.transcript.split(/\s+/).length.toLocaleString()} words`
                    : "None"
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <NoteActions note={note} />
          <ActionPanel.Section>
            <Action.Paste
              title="Paste Summary"
              content={note.summary}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "v" },
                Windows: { modifiers: ["ctrl", "shift"], key: "v" },
              }}
            />
            <Action
              title="Toggle Preview"
              icon={Icon.Sidebar}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "p" },
                Windows: { modifiers: ["ctrl", "shift"], key: "p" },
              }}
              onAction={toggleDetail}
            />
            <Action
              title="Refresh Notes"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
