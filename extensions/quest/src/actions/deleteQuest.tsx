import { Action, Icon } from "@raycast/api";

function DeleteQuestAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Quest"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
      style={Action.Style.Destructive}
    />
  );
}

export default DeleteQuestAction;
