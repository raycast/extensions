import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getAuditEntries, clearAudit } from "./storage";
import { AuditEntry } from "./types";
import { policyColors, modeColors } from "./preferences";

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const auditEntries = await getAuditEntries();
      setEntries(auditEntries);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleClearAudit = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Audit Log",
      message:
        "This will permanently delete all audit entries. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearAudit();
      setEntries([]);
      showToast(Toast.Style.Success, "Audit log cleared");
    }
  };

  const exportAuditLog = async () => {
    const jsonData = JSON.stringify(entries, null, 2);
    await Clipboard.copy(jsonData);
    showToast(Toast.Style.Success, "Audit log copied to clipboard as JSON");
  };

  const totalRedactions = entries.reduce(
    (sum, entry) => sum + entry.redactedCount,
    0
  );
  const totalInputBytes = entries.reduce(
    (sum, entry) => sum + entry.inputLength,
    0
  );
  const totalOutputBytes = entries.reduce(
    (sum, entry) => sum + entry.outputLength,
    0
  );

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Audit Log (${entries.length} entries)`}
      actions={
        <ActionPanel>
          <Action
            title="Export as JSON"
            onAction={exportAuditLog}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Clear All"
            onAction={handleClearAudit}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      {entries.length === 0 ? (
        <List.EmptyView
          title="No Audit Entries"
          description="Redaction history will appear here"
          icon={Icon.Document}
        />
      ) : (
        <>
          <List.Section title="Summary">
            <List.Item
              title="Total Redactions"
              accessories={[{ text: totalRedactions.toString() }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Statistics"
                        text="Aggregate data from all redaction operations"
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Total Entries"
                        text={entries.length.toString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Redactions"
                        text={totalRedactions.toString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Input Processed"
                        text={formatBytes(totalInputBytes)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Output Generated"
                        text={formatBytes(totalOutputBytes)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Bytes Saved"
                        text={formatBytes(totalInputBytes - totalOutputBytes)}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          </List.Section>

          <List.Section title="Recent Activity">
            {entries.map((entry) => {
              const date = new Date(entry.timestamp);
              const timeAgo = formatTimeAgo(entry.timestamp);

              return (
                <List.Item
                  key={entry.id}
                  title={`${entry.redactedCount} redaction${
                    entry.redactedCount === 1 ? "" : "s"
                  }`}
                  subtitle={timeAgo}
                  accessories={[
                    {
                      tag: {
                        value: entry.mode,
                        color: modeColors[entry.mode] as Color,
                      },
                    },
                    {
                      tag: {
                        value: entry.policy,
                        color: policyColors[entry.policy] as Color,
                      },
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Timestamp"
                            text={date.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Mode"
                            text={entry.mode}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Policy"
                            text={entry.policy}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Redactions"
                            text={entry.redactedCount.toString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Detection Types"
                            text={entry.detectionTypes.join(", ")}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Input Size"
                            text={formatBytes(entry.inputLength)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Output Size"
                            text={formatBytes(entry.outputLength)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Size Reduction"
                            text={`${Math.round(
                              (1 - entry.outputLength / entry.inputLength) * 100
                            )}%`}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
