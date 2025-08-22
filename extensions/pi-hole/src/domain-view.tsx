import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { PiHoleDomainList } from "./types/pihole";
import { getPiHoleAPI } from "./utils/api-singleton";

export default function DomainListCommand() {
  const [allowlist, setAllowlist] = useState<PiHoleDomainList[]>([]);
  const [denylist, setDenylist] = useState<PiHoleDomainList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = getPiHoleAPI();

  const fetchDomainLists = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allowlistData, denylistData] = await Promise.all([
        api.getAllowlist(),
        api.getDenylist(),
      ]);

      setAllowlist(allowlistData);
      setDenylist(denylistData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainLists();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Domain Lists"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={fetchDomainLists}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search domains..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            onAction={fetchDomainLists}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Allowlist (Whitelist)">
        {allowlist.length === 0 ? (
          <List.Item
            title="No domains in allowlist"
            subtitle="Allowed domains will appear here"
            icon={Icon.Circle}
          />
        ) : (
          allowlist.map((domain) => (
            <List.Item
              key={`allow-${domain.id}`}
              title={domain.domain}
              subtitle={domain.comment}
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    onAction={fetchDomainLists}
                    icon={Icon.ArrowClockwise}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>

      <List.Section title="Denylist (Blacklist)">
        {denylist.length === 0 ? (
          <List.Item
            title="No domains in denylist"
            subtitle="Blocked domains will appear here"
            icon={Icon.Circle}
          />
        ) : (
          denylist.map((domain) => (
            <List.Item
              key={`deny-${domain.id}`}
              title={domain.domain}
              subtitle={domain.comment}
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    onAction={fetchDomainLists}
                    icon={Icon.ArrowClockwise}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
