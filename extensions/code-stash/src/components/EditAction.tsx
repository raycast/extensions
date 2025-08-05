import { Action, Icon } from "@raycast/api";
import { CodeStash } from "../types";
import Form from "./Form";

function EditAction(props: {
  codeStash: CodeStash;
  onEdit: (title: string, code: string, language: string, id: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<Form codeStash={props.codeStash} onSave={props.onEdit} />}
    />
  );
}

export default EditAction;
