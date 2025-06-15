import { Action, Icon } from "@raycast/api";
import Form from "./Form";

function CreateAction(props: {
  defaultTitle?: string;
  onCreate: (title: string, code: string, language: string, id: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="New"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<Form defaultTitle={props.defaultTitle} onSave={props.onCreate} />}
    />
  );
}

export default CreateAction;
