import { List } from "@raycast/api";
import { useState } from "react";
import { NotesList } from "./components/NotesList";
import { useGetPath, useNoteFetch, usePingJoplin } from "./utils/hooks";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useNoteFetch(searchText);

  useGetPath();
  usePingJoplin();

  return (
    <>
      <List searchBarPlaceholder="Search keywords" onSearchTextChange={setSearchText} isLoading={isLoading}>
        {data?.items.map((note) => <NotesList data={note} key={note.id} />)}
      </List>
    </>
  );
}
