import type { FC } from "react";
import { Action, Icon } from "@raycast/api";
import { Documents } from "../../views";

export const ManageDocumentsAction: FC = () => (
  <Action.Push
    icon={Icon.List}
    shortcut={{ modifiers: ["cmd"], key: "o" }}
    title="Manage Documents"
    target={<Documents />}
  />
);
