import { LaunchProps } from "@raycast/api";
import CreateEditNoteForm from "./components/createEditNoteForm";

const CreateCmd = (props: LaunchProps) => {
  const { title, note } = props.arguments;
  return <CreateEditNoteForm title={title} note={note} isDraft />;
};

export default CreateCmd;
