import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  Cache,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import {
  checkServiceAvailability,
  type ServiceAvailability,
} from "./lib/service-config";

const cache = new Cache();
import { fetchRateLimits } from "./lib/anthropic-api";
import { getSubscriptionInfo } from "./lib/credentials";
import { getProjectSummaries, getUsageTotals } from "./lib/session-parser";
import { fetchCodexUsage } from "./lib/codex-api";
import { getCodexPlanType } from "./lib/codex-credentials";
import type {
  TimeRange,
  ProjectSummary,
  SessionSummary,
  UsageApiResponse,
  RateLimitWindow,
  CodexUsageResponse,
} from "./lib/types";
import type { SubscriptionInfo } from "./lib/credentials";
import type { UsageTotals } from "./lib/session-parser";
import {
  formatPercentage,
  formatResetCountdown,
  formatTokenCount,
  formatCost,
  formatLineCount,
  formatTimestamp,
  formatCodexPlanType,
  unixToIso,
  getUtilizationColor,
  centsToDollars,
} from "./lib/formatting";

interface ServiceData {
  availability: ServiceAvailability;
  rateLimits: UsageApiResponse | null;
  subscription: SubscriptionInfo;
  today: UsageTotals;
  month: UsageTotals;
  codex: CodexUsageResponse | null;
  codexPlanType: string;
}

const emptyTotals: UsageTotals = {
  totalTokens: 0,
  totalCost: 0,
  linesAdded: 0,
  linesRemoved: 0,
};

async function loadServiceData(): Promise<ServiceData> {
  const availability = checkServiceAvailability();

  let subscription: SubscriptionInfo = {
    tierLabel: "Claude",
    subscriptionType: "",
    rateLimitTier: "",
  };
  let rateLimits: UsageApiResponse | null = null;
  let today: UsageTotals = emptyTotals;
  let month: UsageTotals = emptyTotals;

  if (availability.claude) {
    try {
      subscription = getSubscriptionInfo();
    } catch {
      // not authenticated yet
    }

    const [rl, t, m] = await Promise.all([
      fetchRateLimits(),
      getUsageTotals("today"),
      getUsageTotals("month"),
    ]);
    rateLimits = rl;
    today = t;
    month = m;
  }

  let codex: CodexUsageResponse | null = null;
  let codexPlanType = "";
  if (availability.codex) {
    try {
      codexPlanType = getCodexPlanType();
      codex = await fetchCodexUsage();
      if (!codexPlanType && codex.plan_type) {
        codexPlanType = codex.plan_type;
      }
    } catch {
      // Codex not configured — skip silently
    }
  }

  return {
    availability,
    rateLimits,
    subscription,
    today,
    month,
    codex,
    codexPlanType,
  };
}

type ServiceFilter = "claude" | "codex";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past 7 Days" },
  { value: "month", label: "Past 30 Days" },
  { value: "all", label: "All Time" },
];

export default function TokenWatcher() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter | null>(
    null,
  );

  const {
    data: service,
    isLoading: serviceLoading,
    revalidate: revalidateService,
  } = useCachedPromise(loadServiceData, [], { keepPreviousData: true });

  const {
    data: projects,
    isLoading: projLoading,
    revalidate: revalidateProjects,
  } = useCachedPromise(
    (range: TimeRange) => getProjectSummaries(range),
    [timeRange],
    { keepPreviousData: true },
  );

  const isLoading = serviceLoading || projLoading;

  const refresh = useCallback(() => {
    revalidateService();
    revalidateProjects();
  }, [revalidateService, revalidateProjects]);

  const totalCost = projects?.reduce((s, p) => s + p.totalCost, 0) ?? 0;
  const totalTokens =
    projects?.reduce(
      (s, p) =>
        s +
        p.totalTokens.input_tokens +
        p.totalTokens.output_tokens +
        p.totalTokens.cache_creation_input_tokens +
        p.totalTokens.cache_read_input_tokens,
      0,
    ) ?? 0;

  const configured = service?.availability.configured ?? [];
  const hasMultiple = configured.length > 1;

  // Auto-select the first configured service if not set yet
  const activeFilter: ServiceFilter =
    serviceFilter ?? (configured[0] as ServiceFilter) ?? "claude";

  const cycleTimeRange = useCallback(() => {
    setTimeRange((prev) => {
      const idx = TIME_RANGES.findIndex((t) => t.value === prev);
      return TIME_RANGES[(idx + 1) % TIME_RANGES.length].value;
    });
  }, []);

  const timeLabel = TIME_RANGES.find((t) => t.value === timeRange)?.label ?? "";

  // No services configured → setup screen
  if (service && !service.availability.anyConfigured) {
    return <SetupScreen isLoading={isLoading} revalidate={revalidateService} />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        hasMultiple ? (
          <List.Dropdown
            tooltip="Service"
            value={activeFilter}
            onChange={(v) => {
              setServiceFilter(v as ServiceFilter);
              cache.set("menuBarService", v);
            }}
          >
            <List.Dropdown.Item title="Claude" value="claude" />
            <List.Dropdown.Item title="Codex" value="codex" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {/* === Claude service === */}
      {service && service.availability.claude && activeFilter === "claude" && (
        <ClaudeSection
          service={service}
          refresh={refresh}
          hasCodex={hasMultiple}
          timeLabel={timeLabel}
          cycleTimeRange={cycleTimeRange}
        />
      )}

      {/* === Codex service === */}
      {service?.codex &&
        service.availability.codex &&
        activeFilter === "codex" && (
          <CodexSection
            codex={service.codex}
            planType={service.codexPlanType}
            refresh={refresh}
          />
        )}

      {/* === Projects (Claude only) === */}
      {service?.availability.claude && activeFilter === "claude" && (
        <List.Section
          title="Projects"
          subtitle={`${timeLabel} · ${formatTokenCount(totalTokens)} tokens · ${formatCost(totalCost)}`}
        >
          {projects?.map((project) => (
            <ProjectItem
              key={project.projectDir}
              project={project}
              hasCodex={hasMultiple}
              timeLabel={timeLabel}
              cycleTimeRange={cycleTimeRange}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ─── Setup Screen ──────────────────────────────────────────────────────────

function SetupScreen({
  isLoading,
  revalidate,
}: {
  isLoading: boolean;
  revalidate: () => void;
}) {
  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Stars}
        title="Welcome to Token Watcher"
        description="Set up at least one CLI tool to get started."
        actions={
          <ActionPanel>
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Get Started">
        <List.Item
          icon={Icon.Terminal}
          title="Set up Claude Code"
          subtitle="Run `claude` to authenticate"
          accessories={[
            { icon: Icon.Info, tooltip: "~/.claude/.credentials.json" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Claude Code Docs"
                icon={Icon.Globe}
                onAction={() =>
                  open(
                    "https://docs.anthropic.com/en/docs/claude-code/overview",
                  )
                }
              />
              <Action
                title="Check Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Terminal}
          title="Set up Codex"
          subtitle="Run `codex` to authenticate"
          accessories={[{ icon: Icon.Info, tooltip: "~/.codex/auth.json" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Codex Docs"
                icon={Icon.Globe}
                onAction={() => open("https://codex.openai.com")}
              />
              <Action
                title="Check Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─── Claude Service Section ───────────────────────────────────────────────

function TimeRangeAction({
  hasCodex,
  timeLabel,
  cycleTimeRange,
}: {
  hasCodex: boolean;
  timeLabel: string;
  cycleTimeRange: () => void;
}) {
  if (!hasCodex) return null;
  return (
    <Action
      title={`Time Range: ${timeLabel}`}
      icon={Icon.Calendar}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onAction={cycleTimeRange}
    />
  );
}

function ClaudeSection({
  service,
  refresh,
  hasCodex,
  timeLabel,
  cycleTimeRange,
}: {
  service: ServiceData;
  refresh: () => void;
  hasCodex: boolean;
  timeLabel: string;
  cycleTimeRange: () => void;
}) {
  const { rateLimits, subscription, today, month } = service;

  if (!rateLimits) return null;

  return (
    <List.Section title={`Claude · ${subscription.tierLabel}`}>
      <RateLimitItem
        label="Session"
        window={rateLimits.five_hour}
        refresh={refresh}
        hasCodex={hasCodex}
        timeLabel={timeLabel}
        cycleTimeRange={cycleTimeRange}
      />
      <RateLimitItem
        label="Weekly"
        window={rateLimits.seven_day}
        refresh={refresh}
        hasCodex={hasCodex}
        timeLabel={timeLabel}
        cycleTimeRange={cycleTimeRange}
      />
      {rateLimits.seven_day_sonnet && (
        <RateLimitItem
          label="Sonnet"
          window={rateLimits.seven_day_sonnet}
          refresh={refresh}
          hasCodex={hasCodex}
          timeLabel={timeLabel}
          cycleTimeRange={cycleTimeRange}
        />
      )}
      {rateLimits.seven_day_opus && (
        <RateLimitItem
          label="Opus"
          window={rateLimits.seven_day_opus}
          refresh={refresh}
          hasCodex={hasCodex}
          timeLabel={timeLabel}
          cycleTimeRange={cycleTimeRange}
        />
      )}
      {rateLimits.extra_usage?.is_enabled && (
        <List.Item
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.SecondaryText,
          }}
          title="Extra Usage"
          accessories={[
            {
              text: `${formatCost(centsToDollars(rateLimits.extra_usage.used_credits))} / ${formatCost(centsToDollars(rateLimits.extra_usage.monthly_limit))}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <TimeRangeAction
                hasCodex={hasCodex}
                timeLabel={timeLabel}
                cycleTimeRange={cycleTimeRange}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Used"
                    text={formatCost(
                      centsToDollars(rateLimits.extra_usage.used_credits),
                    )}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Monthly Limit"
                    text={formatCost(
                      centsToDollars(rateLimits.extra_usage.monthly_limit),
                    )}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Utilization"
                    text={`${rateLimits.extra_usage.monthly_limit > 0 ? ((rateLimits.extra_usage.used_credits / rateLimits.extra_usage.monthly_limit) * 100).toFixed(0) : 0}%`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
      <List.Item
        icon={Icon.Coins}
        title="Cost"
        accessories={[
          {
            text: `Today ${formatCost(today.totalCost)} · 30d ${formatCost(month.totalCost)}`,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <TimeRangeAction
              hasCodex={hasCodex}
              timeLabel={timeLabel}
              cycleTimeRange={cycleTimeRange}
            />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Today"
                  text={`${formatCost(today.totalCost)} · ${formatTokenCount(today.totalTokens)} tokens`}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Last 30 Days"
                  text={`${formatCost(month.totalCost)} · ${formatTokenCount(month.totalTokens)} tokens`}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
      <List.Item
        icon={Icon.Code}
        title="Lines"
        accessories={[
          {
            text: `Today ${formatLineCount(today.linesAdded, today.linesRemoved)}`,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <TimeRangeAction
              hasCodex={hasCodex}
              timeLabel={timeLabel}
              cycleTimeRange={cycleTimeRange}
            />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Today"
                  text={formatLineCount(today.linesAdded, today.linesRemoved)}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Last 30 Days"
                  text={formatLineCount(month.linesAdded, month.linesRemoved)}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List.Section>
  );
}

// ─── Codex Service Section ────────────────────────────────────────────────

function CodexSection({
  codex,
  planType,
  refresh,
}: {
  codex: CodexUsageResponse;
  planType: string;
  refresh: () => void;
}) {
  const primary = codex.rate_limit?.primary_window;
  const secondary = codex.rate_limit?.secondary_window;

  return (
    <List.Section title={`Codex · ${formatCodexPlanType(planType)}`}>
      {primary && (
        <CodexRateLimitItem
          label="Session"
          usedPercent={primary.used_percent}
          resetAt={primary.reset_at}
          windowSeconds={primary.limit_window_seconds}
          refresh={refresh}
        />
      )}
      {secondary && (
        <CodexRateLimitItem
          label="Weekly"
          usedPercent={secondary.used_percent}
          resetAt={secondary.reset_at}
          windowSeconds={secondary.limit_window_seconds}
          refresh={refresh}
        />
      )}
      {!primary && !secondary && (
        <List.Item
          icon={Icon.Info}
          title="No usage data"
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text="No rate limit data available"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
      {codex.credits && !codex.credits.unlimited && (
        <List.Item
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.SecondaryText,
          }}
          title="Credits"
          accessories={[
            { text: `$${Number(codex.credits.balance ?? 0).toFixed(2)}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Balance"
                    text={`$${Number(codex.credits.balance ?? 0).toFixed(2)}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Has Credits"
                    text={codex.credits.has_credits ? "Yes" : "No"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
    </List.Section>
  );
}

function CodexRateLimitItem({
  label,
  usedPercent,
  resetAt,
  windowSeconds,
  refresh,
}: {
  label: string;
  usedPercent: number;
  resetAt: number;
  windowSeconds: number;
  refresh: () => void;
}) {
  const left = Math.max(0, 100 - usedPercent);
  const resetIso = unixToIso(resetAt);
  const windowLabel =
    windowSeconds >= 86400
      ? `${Math.round(windowSeconds / 86400)}d`
      : `${Math.round(windowSeconds / 3600)}h`;

  return (
    <List.Item
      icon={{
        source: Icon.CircleFilled,
        tintColor: getUtilizationColor(usedPercent),
      }}
      title={label}
      accessories={[
        { text: `${left.toFixed(0)}% left` },
        { text: `Resets in ${formatResetCountdown(resetIso)}` },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Utilization"
                text={formatPercentage(usedPercent)}
              />
              <List.Item.Detail.Metadata.Label
                title="Remaining"
                text={`${left.toFixed(1)}%`}
              />
              <List.Item.Detail.Metadata.Label
                title="Window"
                text={windowLabel}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={
                    left <= 10
                      ? "Critical"
                      : left <= 20
                        ? "High"
                        : left <= 50
                          ? "Medium"
                          : "Low"
                  }
                  color={getUtilizationColor(usedPercent)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Resets"
                text={`in ${formatResetCountdown(resetIso)}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Reset Time"
                text={formatTimestamp(resetIso)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

// ─── Claude Rate Limit Item ───────────────────────────────────────────────

function RateLimitItem({
  label,
  window: w,
  refresh,
  hasCodex,
  timeLabel,
  cycleTimeRange,
}: {
  label: string;
  window: RateLimitWindow;
  refresh: () => void;
  hasCodex: boolean;
  timeLabel: string;
  cycleTimeRange: () => void;
}) {
  const left = Math.max(0, 100 - w.utilization);
  return (
    <List.Item
      icon={{
        source: Icon.CircleFilled,
        tintColor: getUtilizationColor(w.utilization),
      }}
      title={label}
      accessories={[
        { text: `${left.toFixed(0)}% left` },
        { text: `Resets in ${formatResetCountdown(w.resets_at)}` },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          <TimeRangeAction
            hasCodex={hasCodex}
            timeLabel={timeLabel}
            cycleTimeRange={cycleTimeRange}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Utilization"
                text={formatPercentage(w.utilization)}
              />
              <List.Item.Detail.Metadata.Label
                title="Remaining"
                text={`${left.toFixed(1)}%`}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={
                    left <= 10
                      ? "Critical"
                      : left <= 20
                        ? "High"
                        : left <= 50
                          ? "Medium"
                          : "Low"
                  }
                  color={getUtilizationColor(w.utilization)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Resets"
                text={`in ${formatResetCountdown(w.resets_at)}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Reset Time"
                text={formatTimestamp(w.resets_at)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────

function ProjectItem({
  project,
  hasCodex,
  timeLabel,
  cycleTimeRange,
}: {
  project: ProjectSummary;
  hasCodex: boolean;
  timeLabel: string;
  cycleTimeRange: () => void;
}) {
  const name = project.projectPath.split("/").pop() || project.projectDir;
  const allTokens =
    project.totalTokens.input_tokens +
    project.totalTokens.output_tokens +
    project.totalTokens.cache_creation_input_tokens +
    project.totalTokens.cache_read_input_tokens;

  if (project.sessions.length === 1) {
    // Single session — show it directly as the project item
    return (
      <SessionItem
        session={project.sessions[0]}
        projectPath={project.projectPath}
        title={name}
        hasCodex={hasCodex}
        timeLabel={timeLabel}
        cycleTimeRange={cycleTimeRange}
      />
    );
  }

  return (
    <List.Item
      icon={Icon.Folder}
      title={name}
      accessories={[
        { text: `${formatTokenCount(allTokens)}` },
        { text: formatCost(project.totalCost) },
        { tag: `${project.sessionCount} sessions` },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Project Path"
            content={project.projectPath}
          />
          <TimeRangeAction
            hasCodex={hasCodex}
            timeLabel={timeLabel}
            cycleTimeRange={cycleTimeRange}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Project"
                text={project.projectPath}
              />
              <List.Item.Detail.Metadata.Label
                title="Sessions"
                text={String(project.sessionCount)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Input Tokens"
                text={formatTokenCount(project.totalTokens.input_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Output Tokens"
                text={formatTokenCount(project.totalTokens.output_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Write"
                text={formatTokenCount(
                  project.totalTokens.cache_creation_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Read"
                text={formatTokenCount(
                  project.totalTokens.cache_read_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Total Tokens"
                text={formatTokenCount(allTokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Total Cost"
                text={formatCost(project.totalCost)}
              />
              <List.Item.Detail.Metadata.Label
                title="Lines"
                text={formatLineCount(project.linesAdded, project.linesRemoved)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function SessionItem({
  session,
  projectPath,
  title,
  hasCodex,
  timeLabel,
  cycleTimeRange,
}: {
  session: SessionSummary;
  projectPath: string;
  title?: string;
  hasCodex: boolean;
  timeLabel: string;
  cycleTimeRange: () => void;
}) {
  const sessionTokens =
    session.totalTokens.input_tokens +
    session.totalTokens.output_tokens +
    session.totalTokens.cache_creation_input_tokens +
    session.totalTokens.cache_read_input_tokens;

  const modelShort = session.model
    .replace("claude-", "")
    .replace(/-\d{8}$/, "");

  return (
    <List.Item
      icon={Icon.Document}
      title={title ?? session.sessionId.slice(0, 8)}
      subtitle={modelShort}
      accessories={[
        { text: formatTokenCount(sessionTokens) },
        { text: formatCost(session.costUSD) },
        { date: new Date(session.lastTimestamp) },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Session Id"
            content={session.sessionId}
          />
          <Action.CopyToClipboard
            title="Copy Cost Summary"
            content={`Session ${session.sessionId}\nProject: ${projectPath}\nModel: ${session.model}\nTokens: ${sessionTokens.toLocaleString()}\nCost: ${formatCost(session.costUSD)}`}
          />
          <TimeRangeAction
            hasCodex={hasCodex}
            timeLabel={timeLabel}
            cycleTimeRange={cycleTimeRange}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Session ID"
                text={session.sessionId}
              />
              <List.Item.Detail.Metadata.Label
                title="Model"
                text={session.model}
              />
              <List.Item.Detail.Metadata.Label
                title="Messages"
                text={String(session.messageCount)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Input Tokens"
                text={formatTokenCount(session.totalTokens.input_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Output Tokens"
                text={formatTokenCount(session.totalTokens.output_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Write"
                text={formatTokenCount(
                  session.totalTokens.cache_creation_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Read"
                text={formatTokenCount(
                  session.totalTokens.cache_read_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Cost"
                text={formatCost(session.costUSD)}
              />
              <List.Item.Detail.Metadata.Label
                title="Lines"
                text={formatLineCount(session.linesAdded, session.linesRemoved)}
              />
              <List.Item.Detail.Metadata.Label
                title="Started"
                text={formatTimestamp(session.firstTimestamp)}
              />
              <List.Item.Detail.Metadata.Label
                title="Last Activity"
                text={formatTimestamp(session.lastTimestamp)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
