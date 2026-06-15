import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  open,
  confirmAlert,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createClientFromPreferences } from "./create-client";
import type { RecentReceiptRow } from "./one-time-secret-client";

function formatTtl(seconds: number): string {
  if (seconds <= 0) {
    return "expired";
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 48) {
    return `${Math.round(seconds / 86400)}d left`;
  }
  if (h > 0) {
    return `${h}h ${m}m left`;
  }
  return `${m}m left`;
}

function formatTime(unix: number): string {
  if (!unix) {
    return "";
  }
  return new Date(unix * 1000).toLocaleString();
}

function statusLabel(row: RecentReceiptRow): string {
  switch (row.lifecycle) {
    case "burned":
      return "Burned";
    case "received":
      return "Revealed";
    case "viewed":
      return "Viewed";
    default:
      return row.state ?? "New";
  }
}

/** Burn is only allowed before the secret has been revealed or destroyed. */
function canBurnSecret(row: RecentReceiptRow): boolean {
  return row.lifecycle !== "received" && row.lifecycle !== "viewed" && row.lifecycle !== "burned";
}

export default function RecentSecretsCommand() {
  const [rows, setRows] = useState<RecentReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = createClientFromPreferences();
      if (!client.hasCredentials()) {
        setRows([]);
        setError("Add your username and API token in extension preferences to list recent secrets.");
        return;
      }
      const list = await client.getRecentReceipts();
      setRows(list);
    } catch (e) {
      setError(String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && rows.length === 0 && !loading) {
    return (
      <List isLoading={loading}>
        <List.EmptyView
          title="Cannot load recent secrets"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void load()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search recent secrets">
      {rows.map((row) => {
        const title = row.secretShortid ?? row.metadataKey.slice(0, 12);
        const subtitle = `${statusLabel(row)} · ${formatTtl(row.metadataTtlSeconds)} · ${formatTime(row.createdUnix)}`;
        const receiptHistoryUrl = createClientFromPreferences().getReceiptHistoryUrl(row.metadataKey);
        return (
          <List.Item
            key={row.metadataKey}
            title={title}
            subtitle={subtitle}
            accessories={[{ text: row.hasPassphrase ? "Passphrase" : "" }].filter((a) => a.text.length > 0)}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Share Link"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    try {
                      const client = createClientFromPreferences();
                      let secretId = row.secretIdentifier;
                      if (!secretId) {
                        const detail = await client.getPrivateMetadata(row.metadataKey);
                        secretId = detail?.secretIdentifier ?? null;
                      }
                      if (!secretId) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No share link",
                          message: "Could not resolve secret identifier for this item.",
                        });
                        return;
                      }
                      await Clipboard.copy(client.getShareableUrl(secretId));
                      await showToast({ style: Toast.Style.Success, title: "Copied link" });
                    } catch (e) {
                      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
                    }
                  }}
                />
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  onAction={async () => {
                    try {
                      const client = createClientFromPreferences();
                      let secretId = row.secretIdentifier;
                      if (!secretId) {
                        const detail = await client.getPrivateMetadata(row.metadataKey);
                        secretId = detail?.secretIdentifier ?? null;
                      }
                      if (!secretId) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Cannot open",
                          message: "Could not resolve secret identifier.",
                        });
                        return;
                      }
                      await open(client.getShareableUrl(secretId));
                    } catch (e) {
                      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
                    }
                  }}
                />
                <Action.OpenInBrowser
                  title="View Receipt History"
                  url={receiptHistoryUrl}
                  icon={Icon.Receipt}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "h" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "h" },
                  }}
                />
                {canBurnSecret(row) ? (
                  <Action
                    title="Burn Secret"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Burn this secret?",
                        message: "The share link will stop working. This cannot be undone.",
                        primaryAction: { title: "Burn", style: Alert.ActionStyle.Destructive },
                        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
                      });
                      if (!confirmed) {
                        return;
                      }
                      try {
                        const client = createClientFromPreferences();
                        await client.burn(row.metadataKey);
                        await showToast({ style: Toast.Style.Success, title: "Burned" });
                        await load();
                      } catch (e) {
                        await showToast({ style: Toast.Style.Failure, title: "Burn failed", message: String(e) });
                      }
                    }}
                  />
                ) : null}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void load()} />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => openExtensionPreferences()}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        title={loading ? "Loading…" : "No recent secrets"}
        description={
          loading ? undefined : "Create secrets while signed in (username + API token in preferences) to see them here."
        }
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void load()} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
