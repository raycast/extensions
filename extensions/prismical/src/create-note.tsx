import { LaunchProps } from "@raycast/api";
import { NoteForm, NoteDraftValues } from "./components/note-form";
export default function CreateNote({ draftValues }: LaunchProps<{ draftValues: NoteDraftValues }>) {
  return <NoteForm root draftValues={draftValues} />;
}
