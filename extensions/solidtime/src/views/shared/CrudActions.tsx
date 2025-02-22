import { Action, ActionPanel, Icon } from "@raycast/api";
import type { Fn } from "../../utils/types.js";

type CrudActionsProps = {
  name: string;
  onDetails?: Fn;
  onDelete?: Fn;
  onEdit?: Fn;
  onNew?: Fn;

  /** Additional Actions */
  itemActions?: React.ReactNode;
  generalActions?: React.ReactNode;
};
export function CrudActions(props: CrudActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.onDetails && (
          <Action
            title="Show Details"
            icon={Icon.Eye}
            // shortcut={{ modifiers: [], key: "enter" }}
            onAction={props.onDetails}
          />
        )}
        {props.onEdit && (
          <Action
            title={`Edit ${props.name}`}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={props.onEdit}
          />
        )}
        {props.itemActions}
        {props.onDelete && (
          <Action
            title={`Delete ${props.name}`}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            style={Action.Style.Destructive}
            onAction={props.onDelete}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.onNew && (
          <Action
            title={`New ${props.name}`}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={props.onNew}
          />
        )}
        {props.generalActions}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
