import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  AdminTokenError,
  fetchUsage,
  getPreferences,
  UsageQueryError,
  type UsageDay,
  type UsageModel,
  type UsageRange,
  type UsageResponse,
  type UsageSurface,
} from "./api";
import { providerLogo, usageRing } from "./branding";
import { bar, formatCost, formatNumber, formatTokens, shortProviderName } from "./quota";

const RANGES: { value: UsageRange; title: string }[] = [
  { value: "7d", title: "Last 7 days" },
  { value: "30d", title: "Last 30 days" },
  { value: "all", title: "All time" },
];

const SURFACES: { value: UsageSurface; title: string }[] = [
  { value: "all", title: "All surfaces" },
  { value: "codex", title: "Codex" },
  { value: "claude", title: "Claude" },
  { value: "grok", title: "Grok" },
];

function percent(ratio?: number): string {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function modelName(model: UsageModel): string {
  return model.resolvedModel?.trim() || model.model;
}

/** Zero-fills the trailing days so the sparkline keeps a stable axis, like the dashboard chart. */
function recentDays(days: UsageDay[], count: number): UsageDay[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const out: UsageDay[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (count - 1));
  for (let i = 0; i < count; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    const day = byDate.get(iso);
    out.push({
      date: iso,
      requests: day?.requests ?? 0,
      totalTokens: day?.totalTokens ?? 0,
      models: day?.models ?? [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function summaryMarkdown(usage?: UsageResponse): string {
  const summary = usage?.summary;
  if (!summary) return "_No usage data._";
  const days = recentDays(usage?.days ?? [], 14);
  const peak = Math.max(1, ...days.map((day) => day.requests));
  const lines = [
    "# Summary",
    "",
    "```text",
    `Requests      ${formatNumber(summary.requests)}`,
    `Measured      ${formatNumber(summary.measuredRequests)} (${percent(summary.coverageRatio)} coverage)`,
    `Total tokens  ${formatTokens(summary.totalTokens)}`,
    `Input         ${formatTokens(summary.inputTokens)}`,
    `Output        ${formatTokens(summary.outputTokens)}`,
    `Cached in     ${formatTokens(summary.cachedInputTokens)}`,
    `Cache write   ${formatTokens(summary.cacheCreationInputTokens)}`,
    `Reasoning     ${formatTokens(summary.reasoningOutputTokens)}`,
    `List price    ${formatCost(summary.estimatedCostUsd)}`,
    "```",
    "",
    "## Requests per day",
    "",
    "```text",
  ];
  for (const day of days) {
    const label = day.date.slice(5);
    lines.push(`${label}  ${bar((day.requests / peak) * 100, 20)} ${formatNumber(day.requests).padStart(6, " ")}`);
  }
  lines.push("```", "", "_List price is an API-equivalent estimate, not a bill._");
  return lines.join("\n");
}

export default function UsageStatsCommand() {
  const { baseUrl, usageRange } = getPreferences();
  const defaultRange: UsageRange = usageRange === "7d" || usageRange === "all" ? usageRange : "30d";
  const [range, setRange] = useState<UsageRange>(defaultRange);
  const [surface, setSurface] = useState<UsageSurface>("all");

  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (nextRange: UsageRange, nextSurface: UsageSurface) => fetchUsage(nextRange, nextSurface),
    [range, surface],
    { keepPreviousData: true, failureToastOptions: { title: "Cannot reach OpenCodex" } },
  );

  const summary = data?.summary;
  const models = [...(data?.models ?? [])].sort((a, b) => b.totalTokens - a.totalTokens);
  const providers = [...(data?.providers ?? [])].sort((a, b) => b.totalTokens - a.totalTokens);
  const days = [...(data?.days ?? [])].filter((day) => day.requests > 0).reverse();

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => revalidate()}
      />
      <ActionPanel.Submenu title="Filter Surface" icon={Icon.Filter}>
        {SURFACES.map((option) => (
          <Action
            key={option.value}
            title={option.title}
            icon={surface === option.value ? Icon.Checkmark : Icon.Circle}
            onAction={() => setSurface(option.value)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action.OpenInBrowser title="Open Usage Dashboard" url={`${baseUrl}/#usage`} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  if (error) {
    // A reachable proxy that rejects the query is a different problem from an unreachable one,
    // so the message points at the query rather than the connection.
    const reported = error instanceof UsageQueryError;
    const unauthorised = error instanceof AdminTokenError;
    return (
      <List>
        <List.EmptyView
          icon={{
            source: unauthorised ? Icon.Lock : reported ? Icon.ExclamationMark : Icon.Plug,
            tintColor: Color.Red,
          }}
          title={
            unauthorised
              ? "OpenCodex Rejected the Admin Token"
              : reported
                ? "OpenCodex Could Not Return Usage"
                : "Cannot reach OpenCodex"
          }
          description={
            reported || unauthorised
              ? `${error.message}\n\nReported by ${baseUrl}.`
              : `${error.message}\n\nChecked ${baseUrl}. Make sure the proxy is running.`
          }
          actions={actions}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search models, providers, days…"
      actions={actions}
      searchBarAccessory={
        <List.Dropdown tooltip="Range" value={range} onChange={(value) => setRange(value as UsageRange)}>
          {RANGES.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Overview">
        <List.Item
          icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
          title="Summary"
          subtitle={surface === "all" ? undefined : surface}
          accessories={[
            { tag: { value: `${formatNumber(summary?.requests)} req`, color: Color.Blue } },
            { tag: { value: formatTokens(summary?.totalTokens), color: Color.Purple } },
          ]}
          detail={<List.Item.Detail markdown={summaryMarkdown(data)} />}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Providers" subtitle={`${providers.length}`}>
        {providers.map((provider) => (
          <List.Item
            key={provider.provider}
            icon={providerLogo(provider.provider) ?? { source: Icon.Building, tintColor: Color.Green }}
            title={shortProviderName(provider.provider) ?? provider.provider}
            keywords={[provider.provider]}
            accessories={[{ icon: usageRing((provider.shareRatio ?? 0) * 100), text: percent(provider.shareRatio) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Requests" text={formatNumber(provider.requests)} />
                    <List.Item.Detail.Metadata.Label title="Measured" text={formatNumber(provider.measuredRequests)} />
                    <List.Item.Detail.Metadata.Label
                      title="Provider reported"
                      text={formatNumber(provider.reportedRequests)}
                    />
                    <List.Item.Detail.Metadata.Label title="Tokens" text={formatTokens(provider.totalTokens)} />
                    <List.Item.Detail.Metadata.Label title="Traffic share" text={percent(provider.shareRatio)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        ))}
      </List.Section>

      <List.Section title="Models" subtitle={`${models.length}`}>
        {models.map((model) => (
          <List.Item
            key={`${model.provider}/${model.model}`}
            icon={providerLogo(model.provider) ?? { source: Icon.Stars, tintColor: Color.Purple }}
            title={modelName(model)}
            // Provider is already conveyed by the vendor logo; keep it searchable via keywords.
            keywords={[model.provider, model.model, shortProviderName(model.provider) ?? model.provider]}
            accessories={[
              { text: formatTokens(model.totalTokens) },
              { icon: usageRing((model.shareRatio ?? 0) * 100), text: percent(model.shareRatio) },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  `# ${modelName(model)}`,
                  "",
                  "```text",
                  `share ${bar((model.shareRatio ?? 0) * 100, 24)} ${percent(model.shareRatio)}`,
                  "```",
                ].join("\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Provider" text={model.provider} />
                    <List.Item.Detail.Metadata.Label title="Requests" text={formatNumber(model.requests)} />
                    <List.Item.Detail.Metadata.Label title="Measured" text={formatNumber(model.measuredRequests)} />
                    <List.Item.Detail.Metadata.Label title="Total tokens" text={formatTokens(model.totalTokens)} />
                    <List.Item.Detail.Metadata.Label title="Input tokens" text={formatTokens(model.inputTokens)} />
                    <List.Item.Detail.Metadata.Label title="Output tokens" text={formatTokens(model.outputTokens)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        ))}
      </List.Section>

      <List.Section title="Daily" subtitle={`${days.length} active days`}>
        {days.map((day) => (
          <List.Item
            key={day.date}
            icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
            title={day.date}
            accessories={[
              { text: `${formatNumber(day.requests)} req` },
              { tag: { value: formatTokens(day.totalTokens), color: Color.Orange } },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  `# ${day.date}`,
                  "",
                  "```text",
                  ...(day.models ?? [])
                    .slice()
                    .sort((a, b) => b.totalTokens - a.totalTokens)
                    .map(
                      (entry) =>
                        `${entry.model.padEnd(22, " ")} ${formatNumber(entry.requests).padStart(5, " ")} req  ${formatTokens(
                          entry.totalTokens,
                        )}`,
                    ),
                  "```",
                ].join("\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Requests" text={formatNumber(day.requests)} />
                    <List.Item.Detail.Metadata.Label title="Tokens" text={formatTokens(day.totalTokens)} />
                    <List.Item.Detail.Metadata.Label title="Models used" text={String(day.models?.length ?? 0)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  );
}
