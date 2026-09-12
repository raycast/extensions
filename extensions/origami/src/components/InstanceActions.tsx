import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  Toast,
} from "@raycast/api";
import { toggleInstanceArchive } from "../services/archiveService";
import { deleteInstance } from "../services/deleteService";
import { Field, FieldGroup, Instance } from "../types";
import { ClipboardActions } from "./ClipboardActions";
import { CommunicationActions } from "./CommunicationActions";

interface InstanceActionsProps {
  instanceId: string;
  instanceData: Instance["instance_data"] | null;
  selectedEntity: string;
  onArchiveToggle: () => void;
  onDelete?: () => void;
}

/**
 * Provides instance-specific actions like archiving, communication, and clipboard operations
 */
export function InstanceActions({
  instanceId,
  instanceData,
  selectedEntity,
  onArchiveToggle,
  onDelete,
}: InstanceActionsProps) {
  // Extract email and phone fields for quick actions
  const emailFields: Field[] = [];
  const phoneFields: Field[] = [];

  if (instanceData) {
    instanceData.field_groups.forEach((group: FieldGroup) => {
      group.fields_data.forEach((fieldsArray) => {
        fieldsArray.forEach((field) => {
          if (field.field_name.toLowerCase().includes("email") && field.value) {
            emailFields.push(field);
          } else if (
            (field.field_name.toLowerCase().includes("phone") || field.field_name.toLowerCase().includes("mobile")) &&
            field.value
          ) {
            phoneFields.push(field);
          }
        });
      });
    });
  }

  const handleArchiveToggle = async () => {
    if (!instanceId || !selectedEntity) return;

    const isArchived = instanceData?.archived || false;
    const toast = new Toast({
      style: Toast.Style.Animated,
      title: isArchived ? "Unarchiving instance…" : "Archiving instance…",
    });

    try {
      toast.show();
      await toggleInstanceArchive(selectedEntity, instanceId, !isArchived);
      toast.style = Toast.Style.Success;
      toast.title = isArchived ? "Instance unarchived" : "Instance archived";
      onArchiveToggle();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle archive state";
      toast.message = String(error);
    }
  };

  const handleDelete = async () => {
    if (!instanceId || !selectedEntity) return;

    const isConfirmed = await confirmAlert({
      title: "Delete instance?",
      icon: Icon.Trash,
      message: `The instance ${instanceId} will be moved to the Recycle Bin.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!isConfirmed) return;

    const toast = new Toast({
      style: Toast.Style.Animated,
      title: "Deleting instance...",
    });

    try {
      toast.show();

      await deleteInstance(selectedEntity, instanceId);

      toast.style = Toast.Style.Success;
      toast.title = "Instance deleted";

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete instance";
      toast.message = String(error);
    }
  };

  return (
    <>
      <ActionPanel.Section title="Instance">
        <Action
          title="Create Instance"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "create-instance", type: LaunchType.UserInitiated })}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.OpenInBrowser
          title="Edit Instance in Browser"
          icon={Icon.Pencil}
          url={`https://${getPreferenceValues<Preferences>().organization}.origami.ms/${instanceData?.ui_data.url}`}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
        <Action
          title={instanceData?.archived ? "Unarchive Instance" : "Archive Instance"}
          icon={Icon.Tray}
          onAction={handleArchiveToggle}
          shortcut={{ modifiers: ["opt", "cmd"], key: "a" }}
        />
        <Action
          title="Delete Instance"
          icon={Icon.Trash}
          onAction={handleDelete}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>

      <CommunicationActions emailFields={emailFields} phoneFields={phoneFields} />
      <ClipboardActions emailFields={emailFields} phoneFields={phoneFields} instanceId={instanceId} />
    </>
  );
}
