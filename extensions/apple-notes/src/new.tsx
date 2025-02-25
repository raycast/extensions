import { LaunchProps } from "@raycast/api";

import NewNoteForm from "./components/NewNoteForm";

export default function NewNote(props: LaunchProps) {
  return <NewNoteForm draftValues={props.arguments} />;
}
