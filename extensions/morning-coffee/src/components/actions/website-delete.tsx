import { Action, Icon } from "@raycast/api";

interface ActionWebsiteDeleteInterface {
  onDelete(): void;
}

export const ActionWebsiteDelete = ({ onDelete }: ActionWebsiteDeleteInterface) => {
  return (
    <Action icon={Icon.Trash} title="Delete Website" shortcut={{ modifiers: ["ctrl"], key: "x" }} onAction={onDelete} />
  );
};

export default ActionWebsiteDelete;
