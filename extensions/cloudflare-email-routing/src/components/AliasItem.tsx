import { List, ActionPanel, Action, Icon, Color, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { AliasRule } from "../types";
import { deleteRule } from "../services/cf/rules";
import { getColorForTag } from "../utils/colors";

interface AliasItemProps {
  alias: AliasRule;
  onEdit: (alias: AliasRule) => void;
  onDelete: () => void;
}

export function AliasItem({ alias, onEdit, onDelete }: AliasItemProps) {
  const label = alias.name.label || "Unlabeled";
  const accessories = [
    { text: label, icon: { source: Icon.Circle, tintColor: getColorForTag(label) } },
    {
      text: alias.createdAt.toLocaleDateString(),
      icon: Icon.Calendar,
    },
  ];

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Email Alias",
      message: `Are you sure you want to delete the alias "${alias.email}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteRule(alias.id);
        showToast({
          style: Toast.Style.Success,
          title: "Alias Deleted",
          message: `Successfully deleted ${alias.email}`,
        });
        onDelete();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Alias",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  return (
    <List.Item
      title={alias.email}
      subtitle={alias.name.description || "No description"}
      accessories={accessories}
      icon={{
        source: Icon.Envelope,
        tintColor: alias.enabled ? Color.Green : Color.Orange,
      }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Email Address"
            content={alias.email}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Edit Alias"
            icon={Icon.Pencil}
            onAction={() => onEdit(alias)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Delete Alias"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
          <Action.CopyToClipboard
            title="Copy Forwarding Address"
            content={alias.forwardsToEmail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
