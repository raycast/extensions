import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { EveryApi } from "./lib/api";
import type { AuthSession } from "./lib/auth";
import { HttpClient } from "./lib/http";
import { groupLogs, requestMetrics } from "./lib/logs";
import { modelProviderIcon } from "./lib/provider-icons";
import { useSyncQuotaPerUnit } from "./lib/quota";
import { AuthGate } from "./lib/use-auth";
import { apiBase, gatewayOrigin } from "./lib/url";

const DASHBOARD = "https://app.everyapi.ai";

function formatTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleString();
}

function LogsList({
  origin,
  session,
}: {
  origin: string;
  session: AuthSession;
}) {
  const quotaPerUnit = useSyncQuotaPerUnit();
  const api = useMemo(
    () => new EveryApi(new HttpClient({ origin, auth: session })),
    [origin, session],
  );
  const { data, isLoading, revalidate } = usePromise(() => api.logs());
  const groups = groupLogs(data?.success ? data.data.slice(0, 100) : []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="EveryAPI · Recent Requests"
      searchBarPlaceholder="Filter by model or request ID…"
    >
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Recent Requests"
          description="Requests made with this OAuth session will appear here."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Logs in Dashboard"
                url={`${DASHBOARD}/logs`}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.rows.map((row) => {
            const metrics = requestMetrics(row, quotaPerUnit);
            return (
              <List.Item
                key={`${row.id}-${row.created_at}`}
                icon={modelProviderIcon(row.model_name) ?? Icon.ComputerChip}
                title={row.model_name || "Unknown Model"}
                subtitle={formatTime(row.created_at)}
                keywords={[row.request_id ?? "", row.token_name]}
                accessories={[
                  { tag: { value: metrics.tokens, color: Color.Blue } },
                  { text: metrics.cost },
                  { text: metrics.latency, icon: Icon.Clock },
                ]}
                actions={
                  <ActionPanel>
                    {row.request_id ? (
                      <Action.CopyToClipboard
                        title="Copy Request ID"
                        content={row.request_id}
                      />
                    ) : null}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                    />
                    <Action.OpenInBrowser
                      title="Open Logs in Dashboard"
                      url={`${DASHBOARD}/logs`}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

export default function RecentLogs() {
  const preferences = getPreferenceValues<Preferences>();
  const origin = gatewayOrigin(preferences.baseUrl);
  return (
    <AuthGate apiBase={apiBase(origin)}>
      {({ session }) => <LogsList origin={origin} session={session} />}
    </AuthGate>
  );
}
