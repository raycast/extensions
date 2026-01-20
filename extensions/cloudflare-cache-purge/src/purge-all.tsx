import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchZones,
  purgeAllCache,
  Zone,
  showErrorToast,
  showSuccessToast,
} from "./api";

export default function PurgeAllCommand() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedZones = await fetchZones();
      setZones(fetchedZones);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch zones";
      setError(errorMessage);
      await showErrorToast(
        "Failed to load zones",
        err instanceof Error ? err : undefined,
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePurgeAll(zone: Zone) {
    const confirmed = await confirmAlert({
      title: "Purge Entire Cache?",
      message: `This will clear ALL cached content for ${zone.name}. This action cannot be undone.`,
      primaryAction: {
        title: "Purge All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Purging cache...",
      message: zone.name,
    });

    try {
      await purgeAllCache(zone.id);
      await showSuccessToast(`Cache purged for ${zone.name}`);
    } catch (err) {
      await showErrorToast(
        "Failed to purge cache",
        err instanceof Error ? err : undefined,
      );
    }
  }

  function getStatusIcon(zone: Zone) {
    if (zone.paused) {
      return { source: Icon.Pause, tintColor: Color.Orange };
    }
    if (zone.status === "active") {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  if (error && zones.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Zones"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadZones}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search zones...">
      <List.Section title="Cloudflare Zones" subtitle={`${zones.length} sites`}>
        {zones.map((zone) => (
          <List.Item
            key={zone.id}
            title={zone.name}
            subtitle={zone.id}
            icon={getStatusIcon(zone)}
            accessories={[
              {
                tag: {
                  value: zone.status,
                  color:
                    zone.status === "active"
                      ? Color.Green
                      : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Purge All Cache"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={() => handlePurgeAll(zone)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Zone Id"
                    content={zone.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={zone.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh Zones"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadZones}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
