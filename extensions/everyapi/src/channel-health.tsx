import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { getAdminApiBase } from "./lib/client";
import {
  compactHistoryIndicators,
  sortProviders,
  statusFreshness,
} from "./lib/health";
import { statusProviderIcon } from "./lib/provider-icons";

// "Service Status" — upstream provider status at a glance, so you know
// whether a slow/failing call is the gateway or the vendor before you go
// digging. Backend: backend/internal/controller/upstream_status.go
// `GetUpstreamStatus` → backend/pkg/upstream_status.Snapshot. The route is
// public (no auth) — it aggregates the vendors' own public status pages
// (status.openai.com, status.anthropic.com, …) plus a 24h sample history
// kept by the gateway. Indicator vocabulary follows Atlassian Statuspage:
// none | minor | major | critical | unknown.

interface Component {
  name: string;
  status: string; // operational | degraded_performance | partial_outage | major_outage | under_maintenance
}

interface Incident {
  name: string;
  status: string; // investigating | identified | monitoring | resolved
  impact: string; // none | minor | major | critical
  updated_at?: string;
}

interface SamplePoint {
  ts: number; // bucket-aligned unix seconds
  indicator: string;
}

interface ProviderStatus {
  id: string;
  name: string;
  short: string;
  status_url: string;
  indicator: string;
  description?: string;
  components?: Component[]; // all components, non-operational first (capped by backend)
  incidents?: Incident[]; // active incidents only
  history?: SamplePoint[]; // 24h of bucket samples, oldest-first
  fetched_at: number; // unix seconds; 0 = never fetched
}

interface StatusResp {
  success: boolean;
  data: { providers: ProviderStatus[] };
}

const DASHBOARD = "https://app.everyapi.ai";

// Severity rank doubles as the sort key — providers with active trouble
// float to the top of the list, healthy ones sink.
const SEVERITY: Record<string, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  unknown: 1,
  none: 0,
};

function indicatorColor(indicator: string): Color {
  switch (indicator) {
    case "none":
      return Color.Green;
    case "minor":
      return Color.Yellow;
    case "major":
    case "critical":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

function indicatorLabel(indicator: string): string {
  switch (indicator) {
    case "none":
      return "Operational";
    case "minor":
      return "Degraded";
    case "major":
      return "Partial outage";
    case "critical":
      return "Major outage";
    default:
      return "Unknown";
  }
}

// 24h heatmap strip for the detail pane. Raycast markdown can't color
// text, but emoji squares render fine and match the dashboard's
// /performance heatmap semantics: green = none, yellow = minor,
// red = major/critical, white = unknown/no sample.
function historyStrip(history: SamplePoint[]): string {
  return compactHistoryIndicators(history.map((point) => point.indicator))
    .map((indicator) => {
      switch (indicator) {
        case "none":
          return "🟩";
        case "minor":
          return "🟨";
        case "major":
        case "critical":
          return "🟥";
        default:
          return "⬜";
      }
    })
    .join("");
}

function detailMarkdown(p: ProviderStatus): string {
  const lines: string[] = [`## ${p.name}`, ""];
  lines.push(p.description || indicatorLabel(p.indicator));

  if (p.history && p.history.length > 0) {
    lines.push(
      "",
      "### Last 24h",
      "",
      historyStrip(p.history),
      "",
      "_oldest → now_",
    );
  }

  const affected = (p.components ?? []).filter(
    (c) => c.status !== "operational",
  );
  if (affected.length > 0) {
    lines.push("", "### Affected components", "");
    for (const c of affected) {
      lines.push(`- **${c.name}** — ${c.status.replace(/_/g, " ")}`);
    }
  }

  if (p.incidents && p.incidents.length > 0) {
    lines.push("", "### Active incidents", "");
    for (const i of p.incidents) {
      // updated_at is ISO 8601 from the vendor's statuspage — keep it UTC
      // and say so rather than silently showing a timezone-less timestamp.
      const when = i.updated_at
        ? ` · updated ${i.updated_at.slice(0, 16).replace("T", " ")} UTC`
        : "";
      lines.push(`- **${i.name}** — ${i.status}, impact ${i.impact}${when}`);
    }
  }

  return lines.join("\n");
}

export default function ChannelHealth() {
  const url = `${getAdminApiBase()}/upstream-status`;
  // Raycast hides List.Item accessories (and subtitle) while the detail
  // pane is visible, so the colored status tags only exist in list-only
  // mode — keep both reachable via a ⌘D toggle.
  const [showDetail, setShowDetail] = useState(true);

  // Public endpoint — deliberately no Authorization header, so this
  // command works even before the user has configured a valid key.
  const { isLoading, data, error, revalidate } = useFetch<StatusResp>(url, {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load upstream status" },
  });

  const providers = sortProviders(data?.success ? data.data.providers : []);

  const troubled = providers.filter((p) => SEVERITY[p.indicator] >= 2).length;
  const navTitle =
    troubled > 0
      ? `EveryAPI · Service Status · ${troubled} with issues`
      : "EveryAPI · Service Status";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && providers.length > 0}
      navigationTitle={navTitle}
      searchBarPlaceholder="Filter providers…"
    >
      {providers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Plug}
          title={
            error ? "Upstream status unavailable" : "No providers reported"
          }
          description={
            error
              ? `${error.message} — tried GET ${url}. Self-hosted gateways predating /api/upstream-status won't have this route.`
              : "The gateway hasn't sampled any upstream status pages yet."
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Performance Dashboard"
                url={`${DASHBOARD}/performance`}
                icon={Icon.LineChart}
              />
            </ActionPanel>
          }
        />
      ) : (
        providers.map((p) => {
          const incidents = p.incidents?.length ?? 0;
          return (
            <List.Item
              key={p.id}
              icon={statusProviderIcon(p.id) ?? Icon.Network}
              title={p.name}
              subtitle={showDetail ? undefined : p.description}
              accessories={[
                ...(incidents > 0
                  ? [
                      {
                        tag: {
                          value: `${incidents} incident${incidents === 1 ? "" : "s"}`,
                          color: Color.Orange,
                        },
                      },
                    ]
                  : []),
                {
                  tag: {
                    value: indicatorLabel(p.indicator),
                    color: indicatorColor(p.indicator),
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(p)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={indicatorLabel(p.indicator)}
                          color={indicatorColor(p.indicator)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Checked"
                        text={statusFreshness(p.fetched_at)}
                        icon={Icon.Clock}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Status page"
                        target={p.status_url}
                        text={p.status_url.replace(/^https?:\/\//, "")}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Status Page"
                    url={p.status_url}
                    icon={Icon.Globe}
                  />
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "d" },
                      Windows: { modifiers: ["ctrl"], key: "d" },
                    }}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                  <Action.OpenInBrowser
                    title="Open Performance Dashboard"
                    url={`${DASHBOARD}/performance`}
                    icon={Icon.LineChart}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
