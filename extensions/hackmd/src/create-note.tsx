import { SingleNote } from "@hackmd/api/dist/type";
import { showToast, Toast, useNavigation } from "@raycast/api";
import NoteDetail from "./components/NoteDetail";
import NoteForm from "./components/NoteForm";
import api from "./lib/api";

export default function CreateNote() {
  const { push } = useNavigation();

  return (
    <NoteForm
      onSubmit={async (values) => {
        const { teamPath, ...rest } = values;

        try {
          let note: SingleNote;
          if (teamPath) {
            note = await api.createTeamNote(teamPath, rest);
          } else {
            note = await api.createNote(rest);
          }

          push(<NoteDetail noteId={note.id} />);
        } catch (error) {
          showToast({
            title: "Create Note Error",
            message: String(error),
            style: Toast.Style.Failure,
          });
        }
      }}
    />
  );
}
