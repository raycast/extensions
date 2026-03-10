import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  type GatewayProfile,
  resolveActiveProfileSelection,
  setStoredActiveProfileId,
} from "./profiles";

interface GatewayStatus {
  healthy: boolean;
  profileId: string;
  profileName: string;
  endpoint: string;
  agentId: string;
  latency?: number;
  error?: string;
  version?: string;
  sessions?: number;
  checkedAt: number;
}

async function checkGatewayStatus(
  profile: GatewayProfile,
): Promise<GatewayStatus> {
  const startTime = Date.now();

  const status: GatewayStatus = {
    healthy: false,
    profileId: profile.id,
    profileName: profile.name,
    endpoint: profile.endpoint,
    agentId: profile.agentId || "main",
    checkedAt: Date.now(),
  };

  try {
    // Try the health endpoint first
    const healthResponse = await fetch(`${profile.endpoint}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
    });

    if (healthResponse.ok) {
      status.healthy = true;
      status.latency = Date.now() - startTime;
      try {
        const data = (await healthResponse.json()) as {
          version?: string;
          sessions?: number;
        };
        status.version = data.version;
        status.sessions = data.sessions;
      } catch {
        // Health endpoint may not return JSON
      }
      return status;
    }
  } catch {
    // Health endpoint not available, try models endpoint
  }

  try {
    // Fallback: try the models endpoint
    const modelsResponse = await fetch(`${profile.endpoint}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
    });

    status.latency = Date.now() - startTime;

    if (modelsResponse.ok) {
      status.healthy = true;
      return status;
    } else {
      status.error = `HTTP ${modelsResponse.status}`;
    }
  } catch (error) {
    status.latency = Date.now() - startTime;
    status.error = error instanceof Error ? error.message : "Connection failed";
  }

  return status;
}

function buildErrorStatus(
  profile: GatewayProfile,
  error: unknown,
): GatewayStatus {
  return {
    healthy: false,
    profileId: profile.id,
    profileName: profile.name,
    endpoint: profile.endpoint,
    agentId: profile.agentId || "main",
    error: error instanceof Error ? error.message : "Unknown error",
    checkedAt: Date.now(),
  };
}

function buildStatusMarkdown(status: GatewayStatus, isActive: boolean): string {
  const statusEmoji = status.healthy ? "🟢" : "🔴";
  const statusText = status.healthy ? "Connected" : "Unreachable";
  return `# ${statusEmoji} ${status.profileName}

## Connection
| Property | Value |
|----------|-------|
| Status | ${statusEmoji} ${statusText} |
| Active Profile | ${isActive ? "Yes" : "No"} |
| Profile ID | \`${status.profileId}\` |
| Endpoint | \`${status.endpoint}\` |
| Agent ID | \`${status.agentId}\` |
${status.latency ? `| Latency | ${status.latency}ms |` : ""}
${status.version ? `| Version | ${status.version} |` : ""}
${status.sessions !== undefined ? `| Sessions | ${status.sessions} |` : ""}
${status.error ? `| Error | ${status.error} |` : ""}

## Last Check
\`${new Date(status.checkedAt).toLocaleString()}\``;
}

export default function Command() {
  const [profiles, setProfiles] = useState<GatewayProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [statuses, setStatuses] = useState<Record<string, GatewayStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const selection = await resolveActiveProfileSelection();
      setProfiles(selection.profiles);
      setActiveProfileId(selection.activeProfileId);

      const rows = await Promise.all(
        selection.profiles.map(async (profile) => {
          try {
            return await checkGatewayStatus(profile);
          } catch (err) {
            return buildErrorStatus(profile, err);
          }
        }),
      );

      setStatuses(Object.fromEntries(rows.map((row) => [row.profileId, row])));

      const failed = rows.filter((row) => !row.healthy).length;
      if (failed > 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Some gateways unreachable",
          message: `${failed}/${rows.length} failed`,
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.id === activeProfileId && b.id !== activeProfileId) {
        return -1;
      }
      if (b.id === activeProfileId && a.id !== activeProfileId) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [profiles, activeProfileId]);

  const healthyCount = useMemo(
    () => Object.values(statuses).filter((row) => row.healthy).length,
    [statuses],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Gateway status by profile"
    >
      {error ? (
        <List.Section title="Error">
          <List.Item icon={Icon.ExclamationMark} title={error} />
        </List.Section>
      ) : null}

      <List.Section title="Summary">
        <List.Item
          icon={Icon.BarChart}
          title={`${healthyCount}/${profiles.length || 0} reachable`}
          subtitle={
            activeProfileId
              ? `Active profile: ${activeProfileId}`
              : "No active profile"
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh All"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Profiles">
        {sortedProfiles.map((profile) => {
          const status = statuses[profile.id];
          const isActive = profile.id === activeProfileId;
          return (
            <List.Item
              key={profile.id}
              icon={
                status
                  ? status.healthy
                    ? Icon.CheckCircle
                    : Icon.XMarkCircle
                  : Icon.Clock
              }
              title={profile.name}
              subtitle={profile.endpoint}
              accessories={[
                ...(isActive ? [{ text: "Active" }] : []),
                ...(status?.latency ? [{ text: `${status.latency}ms` }] : []),
                ...(status
                  ? [{ text: status.healthy ? "OK" : "Down" }]
                  : [{ text: "Checking..." }]),
              ]}
              detail={
                <List.Item.Detail
                  markdown={
                    status
                      ? buildStatusMarkdown(status, isActive)
                      : `# ${profile.name}\n\nChecking gateway status...`
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh All"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                  <Action
                    title="Set as Active Profile"
                    icon={Icon.CheckCircle}
                    onAction={async () => {
                      await setStoredActiveProfileId(profile.id);
                      setActiveProfileId(profile.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Active profile: ${profile.name}`,
                      });
                    }}
                  />
                  <Action
                    title="Refresh This Profile"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      const next = await checkGatewayStatus(profile);
                      setStatuses((prev) => ({ ...prev, [profile.id]: next }));
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Endpoint"
                    content={profile.endpoint}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Gateway in Browser"
                    url={profile.endpoint}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
