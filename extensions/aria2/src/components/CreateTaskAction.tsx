import { Action, Icon } from "@raycast/api";
import CreateTaskForm from "./CreateTaskForm";

function CreateTaskAction() {
  return (
    <Action.Push
      icon={Icon.Download}
      title="Create Download Task"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTaskForm />}
    />
  );
}

export default CreateTaskAction;
