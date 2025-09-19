import { List, Detail, Action, ActionPanel, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { PiHoleStatus } from "./types/pihole";
import { getPiHoleAPI } from "./utils/api-singleton";

export default function StatusCommand() {
  const [status, setStatus] = useState<PiHoleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = getPiHoleAPI();

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        setError(null);
        const statusData = await api.getStatus();
        setStatus(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const refreshStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusData = await api.getStatus();
      setStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const togglePiHole = async () => {
    if (!status) return;

    try {
      if (status.status === "enabled") {
        await api.disable();
      } else {
        await api.enable();
      }
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle Pi-hole");
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={refreshStatus}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Pi-hole Status">
      <List.Section title="Status">
        <List.Item
          title="Pi-hole Status"
          subtitle={status?.status || "Unknown"}
          icon={{
            source: Icon.Circle,
            tintColor: status?.status === "enabled" ? Color.Green : Color.Red,
          }}
          actions={
            <ActionPanel>
              <Action
                title={
                  status?.status === "enabled"
                    ? "Disable Pi-Hole"
                    : "Enable Pi-Hole"
                }
                onAction={togglePiHole}
                icon={status?.status === "enabled" ? Icon.Stop : Icon.Play}
              />

              <Action
                title="Refresh"
                onAction={refreshStatus}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {status && (
        <List.Section title="Statistics">
          <List.Item
            title="Domains Blocked"
            subtitle={status.domains_being_blocked.toLocaleString()}
            icon={Icon.Shield}
          />
          <List.Item
            title="DNS Queries Today"
            subtitle={status.dns_queries_today.toLocaleString()}
            icon={Icon.Globe}
          />
          <List.Item
            title="Ads Blocked Today"
            subtitle={`${status.ads_blocked_today.toLocaleString()} (${status.ads_percentage_today.toFixed(1)}%)`}
            icon={Icon.XMarkCircle}
          />
          <List.Item
            title="Unique Domains"
            subtitle={status.unique_domains.toLocaleString()}
            icon={Icon.List}
          />
          <List.Item
            title="Queries Forwarded"
            subtitle={status.queries_forwarded.toLocaleString()}
            icon={Icon.ArrowRight}
          />
          <List.Item
            title="Queries Cached"
            subtitle={status.queries_cached.toLocaleString()}
            icon={Icon.HardDrive}
          />
          <List.Item
            title="Unique Clients"
            subtitle={status.unique_clients.toLocaleString()}
            icon={Icon.Person}
          />
        </List.Section>
      )}

      {status?.gravity_last_updated && (
        <List.Section title="Last Updated">
          <List.Item
            title="Gravity Database"
            subtitle={
              status.gravity_last_updated.file_exists
                ? `${status.gravity_last_updated.relative.days}d ${status.gravity_last_updated.relative.hours}h ${status.gravity_last_updated.relative.minutes}m ago`
                : "Never updated"
            }
            icon={Icon.HardDrive}
          />
        </List.Section>
      )}
    </List>
  );
}
