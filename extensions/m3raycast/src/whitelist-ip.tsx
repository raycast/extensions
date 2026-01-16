import { ActionPanel, Action, List, showToast, Toast, Icon, Color, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { listFirewalls, whitelistIP } from "./lib/api";
import { Firewall } from "./lib/types";

export default function WhitelistIPCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [firewalls, setFirewalls] = useState<Firewall[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFirewalls();
  }, []);

  async function loadFirewalls() {
    setIsLoading(true);
    try {
      const result = await listFirewalls();
      if (result.result) {
        setFirewalls(result.firewalls);
      } else {
        throw new Error(result.error || "Failed to load firewalls");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load firewalls",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelection(id: string) {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  }

  async function handleWhitelist(firewallIds: string[]) {
    if (firewallIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Firewalls Selected",
        message: "Select at least one firewall to whitelist",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Whitelisting IP...",
        message: `Updating ${firewallIds.length} firewall(s)`,
      });

      const result = await whitelistIP({ firewall_ids: firewallIds });

      if (result.result && result.results) {
        const updated = result.results.filter((r) => r.updated).length;
        const alreadyWhitelisted = result.results.filter((r) => !r.updated && r.success).length;
        const failed = result.results.filter((r) => !r.success).length;

        let message = "";
        if (updated > 0) message += `Updated: ${updated}`;
        if (alreadyWhitelisted > 0) message += `${message ? ", " : ""}Already whitelisted: ${alreadyWhitelisted}`;
        if (failed > 0) message += `${message ? ", " : ""}Failed: ${failed}`;

        await showToast({
          style: failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
          title: `IP Whitelisted: ${result.current_ip}`,
          message: message || "All firewalls updated",
        });

        await popToRoot();
      } else {
        throw new Error(result.error || "Failed to whitelist IP");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to whitelist IP",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search firewalls...">
      {selectedIds.size > 0 && (
        <List.Section title="Actions">
          <List.Item
            title={`Whitelist on ${selectedIds.size} Selected Firewall(s)`}
            icon={{ source: Icon.Shield, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action
                  title="Whitelist Selected"
                  icon={Icon.Shield}
                  onAction={() => handleWhitelist(Array.from(selectedIds))}
                />
                <Action title="Clear Selection" icon={Icon.XMarkCircle} onAction={() => setSelectedIds(new Set())} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Firewalls">
        {firewalls.map((firewall) => {
          const isSelected = selectedIds.has(firewall.id);
          return (
            <List.Item
              key={firewall.id}
              title={firewall.name}
              subtitle={`${firewall.droplet_count} droplet(s)`}
              icon={
                isSelected
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              accessories={[isSelected ? { tag: { value: "Selected", color: Color.Green } } : {}]}
              actions={
                <ActionPanel>
                  <Action
                    title="Whitelist on This Firewall"
                    icon={Icon.Shield}
                    onAction={() => handleWhitelist([firewall.id])}
                  />
                  <Action
                    title={isSelected ? "Deselect" : "Select for Batch"}
                    icon={isSelected ? Icon.XMarkCircle : Icon.PlusCircle}
                    onAction={() => toggleSelection(firewall.id)}
                  />
                  {selectedIds.size > 0 && (
                    <Action
                      title="Whitelist All Selected"
                      icon={Icon.Shield}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => handleWhitelist(Array.from(selectedIds))}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!isLoading && firewalls.length === 0 && (
        <List.EmptyView
          title="No Firewalls Found"
          description="No DigitalOcean firewalls available"
          icon={Icon.Shield}
        />
      )}
    </List>
  );
}
