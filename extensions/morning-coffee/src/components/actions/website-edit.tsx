import { Action, Icon } from "@raycast/api";
import { FormWebsiteUpsert } from "../forms";

interface ActionWebsiteEditInterface {
  defaultUrl: string;
  onEdit(url: string): void;
}

export const ActionWebsiteEdit = ({ defaultUrl, onEdit }: ActionWebsiteEditInterface) => {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Website"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<FormWebsiteUpsert defaultUrl={defaultUrl} onEdit={onEdit} />}
    />
  );
};

export default ActionWebsiteEdit;
