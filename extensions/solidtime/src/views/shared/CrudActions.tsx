import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
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
            onAction={props.onDetails}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        )}
        {props.onEdit && (
          <Action
            title={`Edit ${props.name}`}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={props.onEdit}
          />
        )}
        {props.itemActions}
        {props.onDelete && (
          <Action
            title={`Delete ${props.name}`}
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            onAction={async () => {
              confirmAlert({
                title: "Are you sure?",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                  onAction: props.onDelete,
                },
              });
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.onNew && (
          <Action
            title={`New ${props.name}`}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={props.onNew}
          />
        )}
        {props.generalActions}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
