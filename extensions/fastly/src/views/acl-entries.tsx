import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Keyboard,
  confirmAlert,
  Alert,
  Clipboard,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { ComputeACL, ComputeACLEntry } from "../types";
import { getComputeACLEntries, updateComputeACLEntries } from "../api";
import { ACLEntryForm } from "./acl-entry-form";
import { ACLBulkAddForm } from "./acl-bulk-add";

interface ACLEntriesProps {
  acl: ComputeACL;
}

function buildCurlCommand(aclId: string): string {
  return `curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" "https://api.fastly.com/resources/acls/${aclId}/entries"`;
}

export function ACLEntries({ acl }: ACLEntriesProps) {
  const [entries, setEntries] = useState<ComputeACLEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const allEntries: ComputeACLEntry[] = [];
      let cursor: string | undefined;

      do {
        const response = await getComputeACLEntries(acl.id, cursor);
        allEntries.push(...response.entries);
        cursor = response.meta.next_cursor;
      } while (cursor);

      setEntries(allEntries);
    } catch (error) {
      console.error("Error loading ACL entries:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load ACL entries",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [acl.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleDeleteEntry(entry: ComputeACLEntry) {
    if (
      await confirmAlert({
        title: "Delete ACL Entry",
        message: `Remove ${entry.prefix} (${entry.action}) from "${acl.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await updateComputeACLEntries(acl.id, [{ op: "delete", prefix: entry.prefix }]);
        await showToast({ style: Toast.Style.Success, title: "Entry deleted", message: entry.prefix });
        await loadEntries();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete entry",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleExportJSON() {
    try {
      const json = JSON.stringify(entries, null, 2);
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "ACL exported",
        message: `${entries.length} entries copied to clipboard as JSON`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export ACL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleExportCSV() {
    try {
      const lines = ["prefix,action"];
      for (const e of entries) {
        lines.push(`${e.prefix},${e.action}`);
      }
      await Clipboard.copy(lines.join("\n"));
      await showToast({
        style: Toast.Style.Success,
        title: "ACL exported",
        message: `${entries.length} entries copied to clipboard as CSV`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export ACL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopyAllPrefixes() {
    const prefixes = entries.map((e) => e.prefix).join("\n");
    await Clipboard.copy(prefixes);
    await showToast({
      style: Toast.Style.Success,
      title: "Prefixes copied",
      message: `${entries.length} prefix${entries.length === 1 ? "" : "es"} copied to clipboard`,
    });
  }

  return (
    <List isLoading={isLoading} navigationTitle={acl.name} searchBarPlaceholder={`Search entries in ${acl.name}...`}>
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Entries Found"
          description={`"${acl.name}" has no entries yet. Press ${String.fromCharCode(8984)}N to add one.`}
          icon={Icon.Shield}
        />
      ) : (
        entries.map((entry) => {
          const isBlocked = entry.action === "BLOCK";
          return (
            <List.Item
              key={entry.prefix}
              title={entry.prefix}
              icon={{
                source: isBlocked ? Icon.XMarkCircle : Icon.CheckCircle,
                tintColor: isBlocked ? Color.Red : Color.Green,
              }}
              accessories={[
                {
                  tag: {
                    value: entry.action,
                    color: isBlocked ? Color.Red : Color.Green,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Entry"
                      target={<ACLEntryForm aclId={acl.id} aclName={acl.name} entry={entry} onSaved={loadEntries} />}
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                    />
                    <Action.Push
                      title="Add Entry"
                      target={<ACLEntryForm aclId={acl.id} aclName={acl.name} onSaved={loadEntries} />}
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action.Push
                      title="Bulk Add IPs"
                      target={<ACLBulkAddForm aclId={acl.id} aclName={acl.name} onSaved={loadEntries} />}
                      icon={Icon.PlusSquare}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "n" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "n" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Prefix"
                      content={entry.prefix}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "c" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                      }}
                    />
                    <Action title="Copy All Prefixes" icon={Icon.Clipboard} onAction={handleCopyAllPrefixes} />
                    <Action.CopyToClipboard
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Copy as cURL Command"
                      content={buildCurlCommand(acl.id)}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "." },
                        Windows: { modifiers: ["ctrl", "shift"], key: "." },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Export">
                    <Action
                      title="Export as JSON"
                      icon={Icon.Download}
                      onAction={handleExportJSON}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "e" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                      }}
                    />
                    <Action title="Export as CSV" icon={Icon.Download} onAction={handleExportCSV} />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteEntry(entry)}
                      shortcut={{
                        macOS: { modifiers: ["ctrl"], key: "x" },
                        Windows: { modifiers: ["ctrl"], key: "x" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Quick Access">
                    <Action
                      title="Refresh Entries"
                      icon={Icon.ArrowClockwise}
                      onAction={loadEntries}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
