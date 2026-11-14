import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { CreateMachineForm } from "./components/create-machine-form";
import { useAccountData } from "./hooks/use-account-data";
import { listMachines } from "./services/machines";
import { deleteSnapshot, listSnapshots } from "./services/snapshots";
import { Snapshot, SnapshotStatus } from "./types";
import { errorToast, showError } from "./utils/errors";
import { formatBytes, formatDateTime, formatRelative } from "./utils/format";
import { Shortcuts } from "./utils/shortcuts";

const STATUS: Record<SnapshotStatus, { label: string; color: Color }> = {
  ready: { label: "Ready", color: Color.Green },
  pending: { label: "Uploading", color: Color.Blue },
  failed: { label: "Failed", color: Color.Red },
};

export default function ManageSnapshots() {
  const {
    data: snapshots,
    isLoading,
    revalidate,
    error,
  } = useAccountData("snapshots", listSnapshots, { onError: errorToast("Could not load snapshots") });
  const { data: machines } = useAccountData("machines", listMachines, { onError: () => undefined });
  const machineNames = new Map((machines ?? []).map((machine) => [machine.id, machine.name]));

  const uploading = !!snapshots?.some((snapshot) => snapshot.status === "pending");
  useEffect(() => {
    if (!uploading) return;
    const timer = setInterval(revalidate, 5000);
    return () => clearInterval(timer);
  }, [uploading, revalidate]);

  async function remove(snapshot: Snapshot) {
    const confirmed = await confirmAlert({
      title: `Delete ${snapshot.name}?`,
      message: "Machines created from it are not affected.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete Snapshot", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${snapshot.name}` });
    try {
      await deleteSnapshot(snapshot.id);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${snapshot.name}`;
      revalidate();
    } catch (error) {
      await showError(error, { toast, title: "Could not delete the snapshot" });
    }
  }

  const sorted = [...(snapshots ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search snapshots...">
      {error && !snapshots ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load snapshots"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={Icon.SaveDocument}
            title="No Snapshots Yet"
            description="Save a machine from Manage Machines with Create Snapshot, then start new machines from it."
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        )
      )}
      {sorted.map((snapshot) => {
        const status = STATUS[snapshot.status];
        const source = machineNames.get(snapshot.sourceMachineId) ?? snapshot.sourceMachineId;
        const size = snapshot.rootSizeBytes + (snapshot.dataSizeBytes ?? 0);
        return (
          <List.Item
            key={snapshot.id}
            icon={{ source: Icon.SaveDocument, tintColor: status.color }}
            title={snapshot.name}
            subtitle={snapshot.description}
            keywords={[snapshot.id, source, snapshot.template.id]}
            accessories={[
              { icon: Icon.ComputerChip, text: source, tooltip: "Saved from" },
              {
                icon: Icon.HardDrive,
                text: formatBytes(size),
                tooltip: snapshot.dataSizeBytes === undefined ? "System files only" : "System files and storage",
              },
              { text: formatRelative(snapshot.createdAt), tooltip: formatDateTime(snapshot.createdAt) },
              { tag: { value: status.label, color: status.color }, tooltip: snapshot.error },
            ]}
            actions={
              <ActionPanel title={snapshot.name}>
                {snapshot.status === "ready" && (
                  <Action.Push
                    title="Create Machine from Snapshot"
                    icon={Icon.Plus}
                    target={<CreateMachineForm defaultSource={`snapshot:${snapshot.id}`} />}
                  />
                )}
                <Action.CopyToClipboard title="Copy Snapshot ID" content={snapshot.id} shortcut={Shortcuts.CopyId} />
                <Action.CopyToClipboard title="Copy Snapshot Name" content={snapshot.name} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action
                  title="Delete Snapshot"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(snapshot)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
