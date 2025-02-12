import { Action, Icon } from "@raycast/api";

function DeleteDrupalWebsiteAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Drupal Website"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}

export default DeleteDrupalWebsiteAction;
