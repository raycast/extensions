import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { chords, getNote } from "../libs/db";
import { Note } from "../libs/note";
import { ChordError } from "./ChordError";
import ChordGrid from "./ChordGrid";

type KeyListProps = {
  noteNames: string[];
};

export default function NoteList({ noteNames }: KeyListProps) {
  return (
    <List>
      {noteNames
        .filter((noteName, index) => {
          // FIXME: Some notes missing
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
                  <Action.Push target={target} title="Open chord details" />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
