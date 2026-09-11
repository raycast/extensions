import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { DASHBOARD_URL, deleteFlag, toggleFlagStatus } from "../../api";
import type { Flag } from "../../types";
import { EditFlag } from "./edit-flag";

export function FlagItem({ flag, onMutate }: { flag: Flag; onMutate: () => void }) {
  const isActive = flag.status === "active";
  const isArchived = flag.status === "archived";

  async function handleToggle() {
    const newStatus = isActive ? "inactive" : "active";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${isActive ? "Deactivating" : "Activating"} flag…`,
    });
    try {
      await toggleFlagStatus(flag.id, newStatus);
      toast.style = Toast.Style.Success;
      toast.title = `Flag ${newStatus}`;
      onMutate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle flag";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleDelete() {
    if (
      await confirmAlert({
        title: `Delete ${flag.name || flag.key}?`,
        message: `This will permanently remove the feature flag "${flag.key}".`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting flag…" });
      try {
        await deleteFlag(flag.id);
        toast.style = Toast.Style.Success;
        toast.title = "Flag deleted";
        onMutate();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete flag";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  return (
    <List.Item
      id={flag.id}
      icon={
        isArchived
          ? { source: Icon.Tray, tintColor: Color.SecondaryText }
          : isActive
            ? { source: Icon.LightBulb, tintColor: Color.Green }
            : { source: Icon.LightBulbOff, tintColor: Color.SecondaryText }
      }
      title={flag.name || flag.key}
      subtitle={flag.name ? flag.key : undefined}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={flag.status}
                  color={isActive ? Color.Green : isArchived ? Color.Orange : Color.Red}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={flag.type}
                icon={flag.type === "boolean" ? Icon.Switch : Icon.List}
              />
              <List.Item.Detail.Metadata.Label
                title="Default Value"
                text={flag.defaultValue ? "true" : "false"}
                icon={flag.defaultValue ? Icon.CheckCircle : Icon.XMarkCircle}
              />
              <List.Item.Detail.Metadata.Label
                title="Rollout"
                text={`${flag.rolloutPercentage}%`}
                icon={{ source: Icon.Signal3, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Separator />
              {flag.environment && (
                <List.Item.Detail.Metadata.Label title="Environment" text={flag.environment} icon={Icon.ComputerChip} />
              )}
              {flag.description && <List.Item.Detail.Metadata.Label title="Description" text={flag.description} />}
              {flag.createdAt && (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(flag.createdAt).toLocaleDateString("en-US")}
                  icon={Icon.Calendar}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Dashboard" text="Open in Databuddy" target={DASHBOARD_URL} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={isActive ? "Deactivate Flag" : "Activate Flag"}
            icon={isActive ? Icon.LightBulbOff : Icon.LightBulb}
            onAction={handleToggle}
          />
          <Action.Push
            title="Edit Flag"
            icon={Icon.Pencil}
            target={<EditFlag flag={flag} onUpdate={onMutate} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Key"
            content={flag.key}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Flag ID"
            content={flag.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.OpenInBrowser title="Open in Databuddy" url={DASHBOARD_URL} />
          <Action
            title="Delete Flag"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
