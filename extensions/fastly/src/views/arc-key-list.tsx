import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArcVirtualKey } from "../types";
import { getArcVirtualKeys, deleteArcVirtualKey, isArcNotEntitledError } from "../api";
import { ArcKeyForm } from "./arc-key-form";
import { ArcKeyRotateForm } from "./arc-key-rotate-form";
import { ArcKeyFailoverForm } from "./arc-key-failover-form";
import { ArcUsageList } from "./arc-usage-list";
import { ArcNotEntitledView } from "./arc-not-entitled";

export function ArcKeyList() {
  const [keys, setKeys] = useState<ArcVirtualKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notEntitled, setNotEntitled] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setIsLoading(true);
      const allKeys: ArcVirtualKey[] = [];
      let cursor: string | undefined;
      let pages = 0;

      do {
        const response = await getArcVirtualKeys({ cursor });
        allKeys.push(...(response.data || []));
        cursor = response.meta?.next_cursor || undefined;
        pages += 1;
      } while (cursor && pages < 20);

      setKeys(allKeys);
    } catch (error) {
      if (isArcNotEntitledError(error)) {
        setNotEntitled(true);
      } else {
        console.error("Error loading virtual keys:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load virtual keys",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteKey(key: ArcVirtualKey) {
    if (
      await confirmAlert({
        title: "Delete Virtual Key",
        message: `Are you sure you want to delete "${key.name}"? Applications using this key will immediately lose access.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteArcVirtualKey(key.id);
        await showToast({ style: Toast.Style.Success, title: "Virtual key deleted", message: key.name });
        await loadKeys();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete virtual key",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  if (notEntitled) {
    return <ArcNotEntitledView />;
  }

  function keyAccessories(key: ArcVirtualKey): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];

    if (key.spend_limit_enabled) {
      accessories.push({
        tag: { value: "Spend Limit", color: Color.Red },
        tooltip: "A spend limit was triggered on this key; requests are blocked until the calendar month resets",
      });
    }

    if (key.security_enabled) {
      accessories.push({
        tag: { value: "Firewall", color: Color.Blue },
        tooltip: `AI Firewall enabled (action: ${key.security_action || "log"})`,
      });
    }

    if (key.rpm_limit != null || key.tpm_limit != null) {
      const limits = [
        key.rpm_limit != null ? `${key.rpm_limit.toLocaleString()} req/min` : null,
        key.tpm_limit != null ? `${key.tpm_limit.toLocaleString()} tokens/min` : null,
      ].filter(Boolean);
      accessories.push({ icon: Icon.Gauge, tooltip: `Rate limit: ${limits.join(", ")}` });
    }

    if (key.expires_at) {
      const expires = new Date(key.expires_at);
      const expired = expires.getTime() < Date.now();
      accessories.push({
        tag: {
          value: expired ? "Expired" : `Expires ${expires.toLocaleDateString()}`,
          color: expired ? Color.Red : Color.SecondaryText,
        },
      });
    }

    if (key.last_used_at) {
      accessories.push({
        date: new Date(key.last_used_at),
        tooltip: `Last used: ${new Date(key.last_used_at).toLocaleString()}`,
      });
    }

    if (key.created_by) {
      accessories.push({ text: key.created_by, tooltip: "Created by" });
    }

    return accessories;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search virtual keys by name, provider, or model...">
      {keys.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Virtual Keys Found"
          description="Create a virtual key to route AI traffic through Fastly AI Runtime Control."
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.Push title="Create Virtual Key" icon={Icon.Plus} target={<ArcKeyForm onSaved={loadKeys} />} />
            </ActionPanel>
          }
        />
      ) : (
        keys.map((key) => (
          <List.Item
            key={key.id}
            title={key.name}
            subtitle={`${key.provider}/${key.model}`}
            keywords={[key.provider, key.model]}
            icon={Icon.Key}
            accessories={keyAccessories(key)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="View Usage" icon={Icon.BarChart} target={<ArcUsageList filterKey={key} />} />
                  <Action.Push
                    title="Edit Key"
                    icon={Icon.Pencil}
                    target={<ArcKeyForm existingKey={key} onSaved={loadKeys} />}
                  />
                  <Action.Push
                    title="Configure Failover"
                    icon={Icon.Switch}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "f" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "f" },
                    }}
                    target={<ArcKeyFailoverForm keyRecord={key} />}
                  />
                  <Action.Push
                    title="Rotate Key"
                    icon={Icon.ArrowClockwise}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "r" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                    }}
                    target={<ArcKeyRotateForm keyRecord={key} onRotated={loadKeys} />}
                  />
                  <Action.Push
                    title="Create Virtual Key"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<ArcKeyForm onSaved={loadKeys} />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Actions">
                  <Action.CopyToClipboard
                    title="Copy Key ID"
                    content={key.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action
                    title="Delete Key"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteKey(key)}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Quick Access">
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadKeys}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
