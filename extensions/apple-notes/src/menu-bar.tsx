import { Icon, MenuBarExtra, getPreferenceValues, open, openCommandPreferences } from "@raycast/api";

import { createNote, openNoteSeparately } from "./api/applescript";
import { fileIcon, getOpenNoteURL } from "./helpers";
import { NoteItem, useNotes } from "./hooks/useNotes";

export default function Command() {
  const { data, isLoading } = useNotes();

  const { maxResults, openSeparately } = getPreferenceValues<Preferences.MenuBar>();
  const max = parseInt(maxResults, 10) ?? 25;
  const maxUnpinnedNotes = max - data.pinnedNotes.length;

  return (
    <MenuBarExtra isLoading={isLoading} icon={{ fileIcon }}>
      {data.pinnedNotes.length > 0 ? (
        <MenuBarExtra.Section title="Pinned">
          {data.pinnedNotes.slice(0, max).map((note) => (
            <NoteMenuBarItem key={note.id} note={note} openSeparately={openSeparately} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {maxUnpinnedNotes > 0 && data.unpinnedNotes.length > 0 ? (
        <MenuBarExtra.Section title="Notes">
          {data.unpinnedNotes.slice(0, maxUnpinnedNotes).map((note) => (
            <NoteMenuBarItem key={note.id} note={note} openSeparately={openSeparately} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="New Note"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => createNote()}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

type NoteMenuBarItemProps = {
  note: NoteItem;
  openSeparately: boolean;
};

function NoteMenuBarItem({ note, openSeparately }: NoteMenuBarItemProps) {
  const title = note.title.length > 40 ? note.title.substring(0, 40) + "…" : note.title;

  return (
    <MenuBarExtra.Item
      key={note.id}
      title={title}
      icon="note"
      onAction={() => (openSeparately ? openNoteSeparately(note.id) : open(getOpenNoteURL(note.UUID)))}
    />
  );
}
