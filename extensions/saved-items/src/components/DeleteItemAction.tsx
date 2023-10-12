import { Action, Icon } from "@raycast/api";

function DeleteItemAction(props: { onDelete: () => void }) {
  return (
    <Action icon={Icon.Trash} title="Delete" shortcut={{ modifiers: ["cmd"], key: "-" }} onAction={props.onDelete} />
  );
}

export default DeleteItemAction;
