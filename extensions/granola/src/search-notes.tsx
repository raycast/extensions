import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import getAccessToken  from "./utils/getAccessToken";
import { fetchGranolaData } from "./utils/fetchData";
import Unresponsive from "./templates/unresponsive";
import { GetDocumentsResponse } from "./utils/types";

interface NoteData {
  isLoading: boolean;
  data: GetDocumentsResponse;
  revalidate: () => void;
}

export default function Command() {
  const noteData = fetchGranolaData("get-documents") as NoteData;

  if ( !noteData?.data && noteData.isLoading === true) {
    return <List isLoading={noteData.isLoading} />
  }

  if ( !noteData?.data && noteData.isLoading === false) {
    return <Unresponsive />
  }

  if (noteData?.data) {
    return (
      <List>
        <List.Item
          icon={Icon.Bird}
          title={getAccessToken()}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
            </ActionPanel>
          }
        />
        {noteData?.data?.docs?.map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.title}
            accessories={[{ text: doc.creation_source }]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<Detail markdown={doc.notes_plain} />} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    )
  }
}
