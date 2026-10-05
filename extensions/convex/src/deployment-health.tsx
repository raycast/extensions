/**
 * Show Deployment Health Command
 *
 * Dashboard-style live insights for the selected deployment: function calls,
 * failure rate, cache hit rate, scheduler health, concurrency, crons, and
 * scheduled functions — with charts, auto-refreshing like the Convex
 * dashboard's health page.
 */

import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { useAuthenticatedListGuard } from "./components/AuthenticatedListGuard";
import { getDeploymentUrl } from "./lib/api";
import {
  fetchDeploymentHealth,
  latestValue,
  maxValue,
  sumSeries,
  type DeploymentHealth,
  type MetricsAuth,
  type NamedSeries,
} from "./lib/metrics";
import {
  lineChartMarkdown,
  seriesColor,
  sparkline,
  currentTheme,
} from "./lib/charts";

const REFRESH_INTERVAL_MS = 10_000;

/** Scheduled-job timestamps arrive in ns, ms, or s depending on source */
function toMs(ts: number): number {
  if (ts > 1e15) return ts / 1e6;
  if (ts > 1e12) return ts;
  return ts * 1000;
}

function formatRelative(ms: number): string {
  const delta = ms - Date.now();
  const abs = Math.abs(delta);
  const minutes = Math.round(abs / 60_000);
  const text =
    minutes < 1
      ? "<1 min"
      : minutes < 60
        ? `${minutes} min`
        : minutes < 60 * 24
          ? `${Math.round(minutes / 60)} h`
          : `${Math.round(minutes / (60 * 24))} d`;
  return delta >= 0 ? `in ${text}` : `${text} ago`;
}

function overallSparkline(series: NamedSeries[]): string {
  if (series.length === 0) return "";
  const length = Math.max(...series.map((s) => s.points.length));
  const summed: (number | null)[] = Array.from({ length }, (_, i) => {
    let bucket: number | null = null;
    for (const { points } of series) {
      const value = points[i]?.[1] ?? null;
      if (value !== null) bucket = (bucket ?? 0) + value;
    }
    return bucket;
  });
  // Compress to ~20 chars so it fits an accessory
  const stride = Math.max(1, Math.floor(summed.length / 20));
  return sparkline(summed.filter((_, i) => i % stride === 0));
}

export default function DeploymentHealthCommand() {
  const { session, selectedContext, deployKeyConfig } = useConvexAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const auth: MetricsAuth | null = deployKeyConfig
    ? {
        deploymentUrl: deployKeyConfig.deploymentUrl,
        token: deployKeyConfig.deployKey,
      }
    : session?.accessToken && selectedContext.deploymentName
      ? {
          deploymentUrl:
            selectedContext.deploymentUrl ??
            getDeploymentUrl(selectedContext.deploymentName),
          token: session.accessToken,
        }
      : null;

  const { data, isLoading, revalidate } = useCachedPromise(
    async (metricsAuth: MetricsAuth) => fetchDeploymentHealth(metricsAuth),
    [auth as MetricsAuth],
    { execute: auth !== null, keepPreviousData: true },
  );

  useEffect(() => {
    if (!autoRefresh || !auth) return;
    const id = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, auth !== null, revalidate]);

  const authGuard = useAuthenticatedListGuard(
    "Connect your Convex account to see deployment health",
  );
  if (authGuard) return authGuard;

  if (!auth) {
    return (
      <List>
        <List.EmptyView
          title="No Deployment Selected"
          description="Use 'Manage Projects' to select a deployment first"
          icon={Icon.Cloud}
        />
      </List>
    );
  }

  const dashboardUrl = `https://dashboard.convex.dev/d/${selectedContext.deploymentName ?? deployKeyConfig?.deploymentName}`;

  const commonActions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action
        title={autoRefresh ? "Pause Auto-Refresh" : "Resume Auto-Refresh"}
        icon={autoRefresh ? Icon.Pause : Icon.Play}
        onAction={() => setAutoRefresh((v) => !v)}
      />
      <Action.OpenInBrowser
        title="Open Health in Dashboard"
        url={dashboardUrl}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    </ActionPanel>
  );

  // null = metric unavailable (fetch failed) — distinct from 0 = healthy
  const health = data;
  const totalCalls = health?.callCountTopK
    ? Math.round(sumSeries(health.callCountTopK))
    : null;
  const peakFailure = health?.failureTopK ? maxValue(health.failureTopK) : null;
  const currentLag = health?.schedulerLag
    ? (latestValue(health.schedulerLag) ?? 0)
    : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Deployment Health"
      searchBarPlaceholder="Filter metrics..."
    >
      <List.Section title="Health (last hour)">
        <List.Item
          title="Function Calls"
          icon={Icon.Bolt}
          accessories={[
            { text: overallSparkline(health?.callCountTopK ?? []) },
            { text: totalCalls === null ? "unavailable" : `${totalCalls}` },
          ]}
          detail={
            <MetricDetail
              title="Function calls per minute"
              series={health?.callCountTopK ?? null}
              formatValue={(v) => String(Math.round(v))}
              footerLabel="Total calls"
              footerValue={
                totalCalls === null ? "unavailable" : String(totalCalls)
              }
            />
          }
          actions={commonActions}
        />
        <List.Item
          title="Failure Rate"
          icon={{
            source:
              peakFailure === null
                ? Icon.QuestionMarkCircle
                : peakFailure > 0
                  ? Icon.XMarkCircle
                  : Icon.CheckCircle,
            tintColor:
              peakFailure === null
                ? Color.SecondaryText
                : peakFailure > 0
                  ? Color.Red
                  : Color.Green,
          }}
          accessories={[
            {
              text:
                peakFailure === null
                  ? "unavailable"
                  : `peak ${peakFailure.toFixed(1)}%`,
            },
          ]}
          detail={
            <MetricDetail
              title="Failure percentage by function"
              series={health?.failureTopK ?? null}
              formatValue={(v) => `${v.toFixed(1)}%`}
              statusCritical
              footerLabel="Peak failure rate"
              footerValue={
                peakFailure === null
                  ? "unavailable"
                  : `${peakFailure.toFixed(1)}%`
              }
            />
          }
          actions={commonActions}
        />
        <List.Item
          title="Cache Hit Rate"
          icon={Icon.MemoryChip}
          accessories={[
            {
              text:
                health && health.cacheHitTopK === null
                  ? "unavailable"
                  : health?.cacheHitTopK?.length
                    ? `${(latestValue(health.cacheHitTopK[0].points) ?? 0).toFixed(0)}%`
                    : "–",
            },
          ]}
          detail={
            <MetricDetail
              title="Query cache hit percentage"
              series={health?.cacheHitTopK ?? null}
              formatValue={(v) => `${v.toFixed(0)}%`}
              yMax={100}
              footerLabel="Window"
              footerValue="last hour"
            />
          }
          actions={commonActions}
        />
        <List.Item
          title="Scheduler Lag"
          icon={Icon.Clock}
          accessories={[
            {
              text:
                currentLag === null
                  ? "unavailable"
                  : `${currentLag.toFixed(0)}s`,
            },
          ]}
          detail={
            <MetricDetail
              title="Scheduled function lag (seconds)"
              series={
                health?.schedulerLag
                  ? [{ name: "lag", points: health.schedulerLag }]
                  : null
              }
              formatValue={(v) => `${v.toFixed(0)}s`}
              footerLabel="Current lag"
              footerValue={
                currentLag === null
                  ? "unavailable"
                  : `${currentLag.toFixed(0)}s`
              }
            />
          }
          actions={commonActions}
        />
        <List.Item
          title="Concurrency"
          icon={Icon.TwoPeople}
          accessories={[
            {
              text:
                health && health.concurrency === null
                  ? "unavailable"
                  : `${(latestValue(health?.concurrency?.find((s) => s.name === "running")?.points ?? []) ?? 0).toFixed(0)} running`,
            },
          ]}
          detail={
            <MetricDetail
              title="Outstanding functions"
              series={health?.concurrency ?? null}
              formatValue={(v) => String(Math.round(v))}
              footerLabel="States"
              footerValue="running / queued"
            />
          }
          actions={commonActions}
        />
      </List.Section>

      <List.Section title="Schedules">
        <List.Item
          title="Cron Jobs"
          icon={Icon.Calendar}
          accessories={[{ text: `${health?.crons.length ?? 0}` }]}
          detail={<CronsDetail health={health} />}
          actions={commonActions}
        />
        <List.Item
          title="Scheduled Functions"
          icon={Icon.AlarmRinging}
          accessories={[{ text: `${health?.scheduledJobs.length ?? 0}` }]}
          detail={<ScheduledJobsDetail health={health} />}
          actions={commonActions}
        />
      </List.Section>

      <List.Section title="Deployment">
        <List.Item
          title="Status"
          icon={{
            source:
              health?.state === "running" ? Icon.CheckCircle : Icon.Warning,
            tintColor: health?.state === "running" ? Color.Green : Color.Orange,
          }}
          accessories={[{ text: health?.state ?? "loading" }]}
          detail={
            <List.Item.Detail
              markdown={`## Deployment status\n\nState: **${health?.state ?? "loading"}**\n\nTotal documents: **${health?.totalDocuments ?? "–"}**\n\nAuto-refresh: ${autoRefresh ? `every ${REFRESH_INTERVAL_MS / 1000}s` : "paused"}`}
            />
          }
          actions={commonActions}
        />
      </List.Section>
    </List>
  );
}

function MetricDetail(props: {
  title: string;
  /** null = the metric could not be fetched this cycle */
  series: NamedSeries[] | null;
  formatValue: (value: number) => string;
  statusCritical?: boolean;
  yMax?: number;
  footerLabel: string;
  footerValue: string;
}) {
  const {
    title,
    series,
    formatValue,
    statusCritical,
    yMax,
    footerLabel,
    footerValue,
  } = props;
  const theme = currentTheme();

  if (series === null) {
    return (
      <List.Item.Detail
        markdown={`## ${title}\n\nThis metric could not be loaded right now. It will retry on the next refresh.`}
      />
    );
  }

  const chart = lineChartMarkdown({
    series,
    formatValue,
    statusCritical,
    yMax,
  });

  return (
    <List.Item.Detail
      markdown={`## ${title}\n\n${chart}`}
      metadata={
        <List.Item.Detail.Metadata>
          {series.map((s, index) => (
            <List.Item.Detail.Metadata.TagList
              key={s.name}
              title={s.name === "_rest" ? "other functions" : s.name}
            >
              <List.Item.Detail.Metadata.TagList.Item
                text={
                  latestValue(s.points) !== null
                    ? formatValue(latestValue(s.points)!)
                    : "no data"
                }
                color={seriesColor(index, s.name, theme)}
              />
            </List.Item.Detail.Metadata.TagList>
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={footerLabel}
            text={footerValue}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function CronsDetail({ health }: { health: DeploymentHealth | undefined }) {
  const crons = health?.crons ?? [];
  const markdown =
    crons.length === 0
      ? "## Cron jobs\n\nNo cron jobs in this deployment."
      : `## Cron jobs\n\n${crons
          .map((cron) => {
            const status =
              cron.lastRunStatus === "success"
                ? "✓ last run ok"
                : cron.lastRunStatus === "error"
                  ? "✗ last run failed"
                  : "not run yet";
            const next = cron.nextRunTs
              ? `next ${formatRelative(toMs(cron.nextRunTs))}`
              : "";
            return `- **${cron.name}** (${cron.schedule}) — ${status}${next ? `, ${next}` : ""}`;
          })
          .join("\n")}`;
  return <List.Item.Detail markdown={markdown} />;
}

function ScheduledJobsDetail({
  health,
}: {
  health: DeploymentHealth | undefined;
}) {
  const jobs = health?.scheduledJobs ?? [];
  const markdown =
    jobs.length === 0
      ? "## Scheduled functions\n\nNothing scheduled right now."
      : `## Scheduled functions\n\n${jobs
          .map(
            (job) =>
              `- **${job.udfPath}** — ${job.state}${job.nextTs ? `, ${formatRelative(toMs(job.nextTs))}` : ""}`,
          )
          .join("\n")}`;
  return <List.Item.Detail markdown={markdown} />;
}
