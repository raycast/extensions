/**
 * Daytona Snapshots Command
 * Task 17: Complete snapshot management with Daytona API integration
 */

import { ActionPanel, Action, List, Icon, showToast, Toast, confirmAlert, Alert, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getDaytonaClient } from "./lib/daytona-client";

interface Snapshot {
  id: string;
  name: string;
  sandboxId: string;
  createdAt: string;
  status: string;
}

function SnapshotsCommand() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSnapshots = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const client = getDaytonaClient();

      // Load snapshots from the daytona.snapshot service (not individual sandboxes)
      const daytonaSnapshots = await client.snapshot.list();

      // Map Daytona snapshots to our interface
      const mappedSnapshots: Snapshot[] = daytonaSnapshots.map((snapshot) => ({
        id: snapshot.name || snapshot.imageName || `snapshot-${Date.now()}`,
        name: snapshot.name || snapshot.imageName || "Unnamed Snapshot",
        sandboxId: "N/A", // Snapshots aren't tied to specific sandboxes
        createdAt: snapshot.createdAt
          ? typeof snapshot.createdAt === "string"
            ? snapshot.createdAt
            : snapshot.createdAt.toISOString()
          : new Date().toISOString(),
        status: snapshot.state || "ready",
      }));

      // Sort by creation date, newest first
      mappedSnapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setSnapshots(mappedSnapshots);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Snapshots",
        message: errorObj.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleRestoreSnapshot = async (snapshot: Snapshot) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Creating Sandbox from Snapshot",
        message: `Creating sandbox from "${snapshot.name}"...`,
      });

      const client = getDaytonaClient();
      // Create a new sandbox from the snapshot
      const newSandbox = await client.create({
        snapshot: snapshot.id,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Sandbox Created",
        message: `New sandbox created from "${snapshot.name}": ${newSandbox.id.substring(0, 8)}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Creation Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDeleteSnapshot = async (snapshot: Snapshot) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Deleting Snapshot",
        message: `Deleting "${snapshot.name}"...`,
      });

      const client = getDaytonaClient();
      // Get the snapshot object first, then delete it
      const snapshotToDelete = await client.snapshot.get(snapshot.id);
      await client.snapshot.delete(snapshotToDelete);

      showToast({
        style: Toast.Style.Success,
        title: "Snapshot Deleted",
        message: `"${snapshot.name}" deleted successfully`,
      });

      // Refresh the list
      await loadSnapshots();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search snapshots..."
      actions={
        snapshots.length === 0 && !isLoading ? (
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadSnapshots}
            />
            <Action
              title="Open Daytona Dashboard"
              icon={Icon.Globe}
              onAction={() => open("https://app.daytona.io/dashboard/snapshots")}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to Load Snapshots"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadSnapshots} />
            </ActionPanel>
          }
        />
      ) : snapshots.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Camera}
          title="No Snapshots Found"
          description="Create snapshots from the Daytona Dashboard to back up your sandbox state"
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadSnapshots} />
              <Action
                title="Open Daytona Dashboard"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard/snapshots")}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Snapshots (${snapshots.length})`}>
          {snapshots.map((snapshot) => (
            <List.Item
              key={snapshot.id}
              title={snapshot.name}
              subtitle="Daytona Snapshot"
              icon={Icon.Camera}
              keywords={[snapshot.name, snapshot.sandboxId]}
              accessories={[
                {
                  icon: snapshot.status === "ready" ? Icon.CheckCircle : Icon.Clock,
                  text: formatDate(snapshot.createdAt),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Sandbox from Snapshot"
                    icon={Icon.Plus}
                    onAction={() => handleRestoreSnapshot(snapshot)}
                  />
                  <ActionPanel.Section title="Management">
                    <Action
                      title="Delete Snapshot"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Delete Snapshot",
                            message: `Are you sure you want to delete "${snapshot.name}"? This action cannot be undone.`,
                            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                          })
                        ) {
                          await handleDeleteSnapshot(snapshot);
                        }
                      }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadSnapshots}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default SnapshotsCommand;
