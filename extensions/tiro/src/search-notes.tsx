import { Action, ActionPanel, Icon, List, openExtensionPreferences, popToRoot } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { listRecentNotes, Note, searchNotes } from "./lib/api";
import { signOut, tiro } from "./lib/auth";
import { formatDate, formatDuration, peopleNames, sourceIcon } from "./lib/format";
import { NoteActions } from "./components/note-actions";

function Command() {
  const [searchText, setSearchText] = useState("");
  const keyword = searchText.trim();

  const { data, isLoading, error } = usePromise(
    async (query: string) => (query ? searchNotes(query) : listRecentNotes()),
    [keyword],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search titles and transcripts"
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Notes"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Sign out and Try Again"
                icon={Icon.Logout}
                onAction={async () => {
                  await signOut();
                  await popToRoot();
                }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={keyword ? "No Matching Notes" : "No Notes Yet"}
          description={keyword ? "Try another keyword." : "Your recent Tiro notes will show up here."}
        />
      )}
      <List.Section title={keyword ? "Results" : "Recent Notes"}>
        {data?.map((note) => (
          <NoteItem key={note.guid} note={note} />
        ))}
      </List.Section>
    </List>
  );
}

function NoteItem({ note }: { note: Note }) {
  const people = peopleNames(note);
  const duration = formatDuration(note.recordingDurationSeconds);
  const snippet = note.matchedSnippets?.[0]?.replace(/\s+/g, " ").trim();

  return (
    <List.Item
      icon={sourceIcon(note.sourceType)}
      title={note.title || "Untitled"}
      subtitle={snippet}
      keywords={people}
      accessories={[
        ...(people.length ? [{ icon: Icon.TwoPeople, text: String(people.length), tooltip: people.join(", ") }] : []),
        ...(duration ? [{ text: duration }] : []),
        { date: new Date(note.createdAt), tooltip: formatDate(note.createdAt) },
      ]}
      actions={<NoteActions note={note} />}
    />
  );
}

export default withAccessToken(tiro)(Command);
