import { List } from "@raycast/api";
import { useGetDeckNames } from "./hooks/useGetDeckNames";
import { useFetchNoteIds } from "./hooks/useGetNotesFromDeck";
import { useEffect, useState } from "react";
import { useFetchNotesInfo } from "./hooks/useGetNotesInfos";
import { NoteInfo } from "./types/note-info";

function DeckDropdown(props: { deckNames: string[]; onDeckNameChange: (newValue: string) => void }) {
  const { deckNames, onDeckNameChange } = props;
  return (
    <List.Dropdown
      tooltip="Select deck name"
      storeValue={true}
      onChange={(newValue) => {
        onDeckNameChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Your decks">
        {deckNames.map((deckName, index) => (
          <List.Dropdown.Item key={index} title={deckName} value={deckName} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [selectedDeckName, setSelectedDeckName] = useState<string>("");
  const [noteIds, setNoteIds] = useState<number[]>([]);
  const { deckNames } = useGetDeckNames();
  const { noteIds: fetchedNoteIds } = useFetchNoteIds(selectedDeckName);
  const { notes, isFetching } = useFetchNotesInfo(noteIds);

  const onDeckNameChange = (newValue: string) => {
    console.log(newValue);
    setSelectedDeckName(newValue);
  };

  useEffect(() => {
    if (fetchedNoteIds.length > 0) {
      setNoteIds(fetchedNoteIds);
    }
  }, [fetchedNoteIds]);

  return (
    <List
      isLoading={isFetching}
      isShowingDetail
      navigationTitle="Search Decks"
      searchBarPlaceholder="Search your favorite deck"
      searchBarAccessory={<DeckDropdown deckNames={deckNames} onDeckNameChange={onDeckNameChange} />}
    >
      {notes.map((note: NoteInfo, index: number) => (
        <List.Item
          key={index}
          title={note.fields.Front.value}
          detail={<List.Item.Detail markdown={note.fields.Back.value} />}
        />
      ))}
    </List>
  );
}
