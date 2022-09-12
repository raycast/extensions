import { Action, Icon } from "@raycast/api";
import CreateForm from "./CreateForm";

function CreateAction(props: {
  defaultTitle?: string;
  onCreate: (title: string, code: string, language: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}

export default CreateAction;
