import { Action, Icon } from "@raycast/api";
import { Documents } from "../../views";

export const ManageDocumentsAction: React.FC = () => (
  <Action.Push
    icon={Icon.List}
    shortcut={{ modifiers: ["cmd"], key: "o" }}
    title="Manage Documents"
    target={<Documents />}
  />
);
