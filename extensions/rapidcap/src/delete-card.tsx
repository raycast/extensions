import { Action, Icon } from "@raycast/api";

function DeleteCardAction(props: { onDelete: () => void }) {
  return <Action icon={Icon.Trash} style={Action.Style.Destructive} title="Delete Card" onAction={props.onDelete} />;
}

export default DeleteCardAction;
