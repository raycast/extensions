import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import getCache from "./utils/getCache";
import { fetchGranolaData } from "./utils/fetchData";
import { Doc, NoteData } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate, NoteListItem } from "./components/NoteComponents";

export default function Command() {
  let noteData: NoteData;
  try {
    noteData = fetchGranolaData("get-documents") as NoteData;
  } catch (error) {
    showFailureToast({ title: "Failed to fetch notes", message: String(error) });
    return <Unresponsive />;
  }

  const cacheData = getCache();
  const panels = cacheData?.state?.documentPanels;

  // if loading...
  if (!noteData?.data && noteData.isLoading === true) {
    return <List isLoading={true} />;
  }

  // if not loading and no data
  if (!noteData?.data && noteData.isLoading === false) {
    return <Unresponsive />;
  }

  // if no cached data
  if (!panels) {
    return <Unresponsive />;
  }

  const untitledNoteTitle = "Untitled Note";

  if (noteData?.data) {
    return (
      <List isLoading={false}>
        {sortNotesByDate(noteData.data.docs || []).map((doc: Doc) => (
          <NoteListItem key={doc.id} doc={doc} panels={panels} untitledNoteTitle={untitledNoteTitle} />
        ))}
      </List>
    );
  }
}
