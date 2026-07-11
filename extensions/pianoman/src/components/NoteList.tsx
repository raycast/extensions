import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { chords, getNote } from "../libs/db";
import { Note } from "../libs/note";
import ChordGrid from "./ChordGrid";

type KeyListProps = {
  noteNames: string[];
  isLoading?: boolean;
};

export default function NoteList({ noteNames, isLoading = false }: KeyListProps) {
  return (
    <List isLoading={isLoading}>
      {noteNames
        .filter((noteName) => {
          // FIXME: Some notes are missing
          return Boolean(getNote(noteName));
        })
        .map((noteName, index) => {
          const singleKeyChords = chords[noteName];
          const rootNote = getNote(noteName) as Note;
          const target = <ChordGrid rootNote={rootNote} chords={singleKeyChords} />;
          return (
            <List.Item
              key={index}
              icon={Icon.Music}
              title={noteName}
              accessories={[{ text: `See chords for ${noteName}` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    target={target}
                    icon={Icon.AppWindowGrid3x3}
                    title="Open Chord Details"
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
