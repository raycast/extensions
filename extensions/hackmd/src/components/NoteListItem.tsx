import type { Note } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getPreferences } from "../lib/preference";
import NoteDetail from "./NoteDetail";
import NoteActions from "./NoteActions";
import { usePinnedNotes } from "../hooks/usePinnedNotes";

export default function NoteListItem({
  note,
  mutate,
  additionalActions,
  showProfileAction,
}: {
  note: Note;
  mutate?: () => void;
  additionalActions?: ActionPanel.Props["children"];
  showProfileAction?: boolean;
}) {
  const { isPinned } = usePinnedNotes();
  const pinned = isPinned(note);
  const { instance_url } = getPreferences();
  const profilePath = note.teamPath || note.userPath;

  return (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.tags?.join(", ")}
      icon={Icon.Document}
      accessories={[
        ...(pinned ? [{ icon: { source: Icon.Pin, tintColor: Color.Red }, tooltip: "Pinned" }] : []),
        ...(note.teamPath
          ? [{ icon: Icon.TwoPeople, tooltip: `Team: ${note.teamPath}` }]
          : [{ icon: Icon.Person, tooltip: "Personal Workspace" }]),
        {
          date: new Date(note.lastChangedAt || note.createdAt),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            target={<NoteDetail noteId={note.id} mutate={mutate} />}
            title="View Detail"
          />

          {note && <NoteActions note={note} mutate={mutate} onDeleteCallback={mutate} />}
          {showProfileAction && profilePath && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open Profile in Browser"
                url={new URL(`@${encodeURIComponent(profilePath)}`, instance_url).toString()}
              />
            </ActionPanel.Section>
          )}
          {additionalActions}
        </ActionPanel>
      }
    />
  );
}
