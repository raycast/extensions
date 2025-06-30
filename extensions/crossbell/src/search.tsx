import { List } from "@raycast/api";
import { useSearch } from "./apis";
import CharacterListItem from "./components/CharacterListItem";
import NoteListItem from "./components/NoteListItem";

export default function Command() {
  const { data, isLoading, setText } = useSearch();

  return (
    <List
      navigationTitle="Search"
      isLoading={isLoading}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search on Crossbell..."
      throttle
    >
      <List.Section title="Characters" subtitle={data?.characters?.count + ""}>
        {data?.characters?.list.map((c) => <CharacterListItem key={c.characterId} character={c} />)}
      </List.Section>

      <List.Section title="Notes" subtitle={data?.notes?.count + ""}>
        {data?.notes?.list.map((n) => <NoteListItem key={`${n.characterId}-${n.noteId}`} note={n} />)}
      </List.Section>
    </List>
  );
}
