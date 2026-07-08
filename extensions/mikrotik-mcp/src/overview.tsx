/**
 * Overview command — the fleet's at-a-glance cockpit. A hero row of KPI cards
 * (calls, throughput, error rate, p95 latency) sits above the call-volume trend,
 * risk mix, hottest tools, per-device load and live device health, with a rich
 * metadata sidebar. Every chart is a visx SVG rendered to an inline image
 * (`./lib/charts`). Auto-refreshes on a 5s poll; the time window is selectable.
 */
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
} from "@raycast/api";
import {
  HEALTH_COLOR,
  RISK_COLOR,
  RISK_TINT,
  WINDOWS,
  bytes,
  ms,
  num,
} from "./lib/format";
import {
  barChart,
  chartImage,
  donutChart,
  gaugeRow,
  multiAreaChart,
  statCards,
} from "./lib/charts";
import { useApi, usePolling } from "./lib/hooks";
import type { DevicesPayload, Meta, Risk, Stats } from "./lib/types";

function errColor(rate: number): Color {
  if (rate >= 0.2) return Color.Red;
  if (rate >= 0.05) return Color.Yellow;
  return Color.Green;
}

const TOOL_HUE = [
  Color.Blue,
  Color.Green,
  Color.Purple,
  Color.Orange,
  Color.Magenta,
  Color.Yellow,
];

export default function Command() {
  const [win, setWin] = useState(3_600_000);
  const {
    data: stats,
    isLoading,
    revalidate,
  } = useApi<Stats>(`/api/stats?window=${win}&buckets=60`);
  const { data: meta } = useApi<Meta>("/api/meta");
  const { data: devicesData } = useApi<DevicesPayload>("/api/devices");
  usePolling(revalidate, 5000);

  const winLabel = WINDOWS.find(([, v]) => v === win)?.[0] ?? `${win}ms`;
  const errPct = stats
    ? (stats.errorRate * 100).toFixed(stats.errorRate >= 0.05 ? 1 : 2)
    : "0";

  // ── fleet health rollup ────────────────────────────────────────────────────
  const devices = devicesData?.devices ?? [];
  const online = devices.filter((d) => d.status.reachable === true).length;
  const offline = devices.filter((d) => d.status.reachable === false).length;
  const busiestDevice = [...devices].sort(
    (a, b) => b.activity.calls - a.activity.calls,
  )[0];
  const slowestTool = stats?.byTool.length
    ? [...stats.byTool].sort((a, b) => b.p95Ms - a.p95Ms)[0]
    : undefined;

  // ── hero KPI cards ─────────────────────────────────────────────────────────
  const callsSpark = stats?.series.map((b) => b.ok + b.error) ?? [];
  const errSpark = stats?.series.map((b) => b.error) ?? [];
  const hero = stats
    ? statCards([
        {
          label: "Calls",
          value: num(stats.total),
          sub: `${num(stats.distinctTools)} tools · ${winLabel}`,
          color: Color.Blue,
          accent: true,
          spark: callsSpark,
        },
        {
          label: "Throughput",
          value: stats.callsPerMin.toFixed(1),
          sub: "calls / min",
          color: Color.Purple,
          spark: callsSpark,
        },
        {
          label: "Error rate",
          value: `${errPct}%`,
          sub: `${num(stats.errors)} errors`,
          color: errColor(stats.errorRate),
          accent: true,
          spark: errSpark,
        },
        {
          label: "p95 latency",
          value: ms(stats.latency.p95),
          sub: `avg ${ms(stats.latency.avg)} · max ${ms(stats.latency.max)}`,
          color: Color.Orange,
        },
      ])
    : "";

  const activity =
    stats && stats.series.length
      ? multiAreaChart(
          [
            {
              values: stats.series.map((b) => b.ok),
              color: Color.Blue,
              label: "ok",
            },
            {
              values: stats.series.map((b) => b.error),
              color: Color.Red,
              label: "error",
            },
          ],
          { height: 180 },
        )
      : "";

  const riskSegs = stats
    ? (Object.entries(stats.byRisk) as [Risk, number][])
        .filter(([, v]) => v > 0)
        .map(([r, v]) => ({ label: r, value: v, color: RISK_COLOR[r] }))
    : [];
  const riskDonut = riskSegs.length
    ? donutChart(riskSegs, {
        centerValue: num(stats?.total ?? 0),
        centerLabel: "calls",
      })
    : "";

  const toolBars =
    stats && stats.byTool.length
      ? barChart(
          stats.byTool.slice(0, 8).map((t, i) => ({
            label: t.tool,
            value: t.count,
            color: TOOL_HUE[i % TOOL_HUE.length],
            sub: `p95 ${ms(t.p95Ms)}${t.errors ? ` · ${t.errors} err` : ""}`,
          })),
          { labelWidth: 180 },
        )
      : "";

  // Per-device call load (only meaningful with more than one device).
  const deviceBars =
    stats && stats.byDevice.length > 1
      ? barChart(
          stats.byDevice.slice(0, 8).map((d, i) => ({
            label: d.device,
            value: d.count,
            color: TOOL_HUE[i % TOOL_HUE.length],
          })),
          { labelWidth: 160 },
        )
      : "";

  // Live system health for the busiest reachable device.
  const health = busiestDevice?.status;
  const healthGauges =
    health &&
    busiestDevice?.status.reachable === true &&
    (health.cpuLoad != null ||
      health.memUsedPct != null ||
      health.hddUsedPct != null)
      ? gaugeRow(
          [
            health.cpuLoad != null
              ? { pct: health.cpuLoad, label: "CPU", color: HEALTH_COLOR.cpu }
              : null,
            health.memUsedPct != null
              ? {
                  pct: health.memUsedPct,
                  label: "MEM",
                  color: HEALTH_COLOR.mem,
                }
              : null,
            health.hddUsedPct != null
              ? {
                  pct: health.hddUsedPct,
                  label: "DISK",
                  color: HEALTH_COLOR.disk,
                }
              : null,
          ].filter((g): g is NonNullable<typeof g> => g != null),
        )
      : "";

  const recentErrors =
    stats && stats.recentErrors.length
      ? `## Recent errors\n\n${stats.recentErrors
          .slice(0, 6)
          .map(
            (e) =>
              `- \`${e.tool}\` — ${e.error.replace(/\n/g, " ").slice(0, 120)}`,
          )
          .join("\n")}`
      : "";

  const markdown = stats
    ? [
        hero ? chartImage(hero, "kpis") : "",
        activity
          ? `\n### Calls over time\n\n${chartImage(activity, "activity")}`
          : "",
        riskDonut ? `\n### By risk\n\n${chartImage(riskDonut, "risk")}` : "",
        toolBars ? `\n### Top tools\n\n${chartImage(toolBars, "tools")}` : "",
        healthGauges
          ? `\n### ${busiestDevice?.name} · live health\n\n${chartImage(healthGauges, "health")}`
          : "",
        deviceBars
          ? `\n### Calls by device\n\n${chartImage(deviceBars, "devices")}`
          : "",
        recentErrors ? `\n${recentErrors}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "Loading dashboard metrics…\n\nSet the **Dashboard URL** and **Access Token** in extension preferences if this stays empty.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`MikroTik MCP — Overview · ${winLabel}`}
      metadata={
        stats ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Calls"
              text={`${num(stats.total)} · ${stats.callsPerMin.toFixed(1)}/min`}
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
            />
            <Detail.Metadata.Label
              title="Error rate"
              text={`${errPct}% (${num(stats.errors)})`}
              icon={{ source: Icon.Dot, tintColor: errColor(stats.errorRate) }}
            />
            <Detail.Metadata.Label
              title="Latency (avg · p95 · p99)"
              text={`${ms(stats.latency.avg)} · ${ms(stats.latency.p95)} · ${ms(stats.latency.p99)}`}
              icon={{ source: Icon.Gauge, tintColor: Color.Orange }}
            />
            <Detail.Metadata.Label
              title="Max latency"
              text={ms(stats.latency.max)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Distinct tools"
              text={num(stats.distinctTools)}
            />
            {stats.byTool.length ? (
              <Detail.Metadata.Label
                title="Busiest tool"
                text={`${stats.byTool[0].tool} (${num(stats.byTool[0].count)})`}
              />
            ) : null}
            {slowestTool ? (
              <Detail.Metadata.Label
                title="Slowest tool"
                text={`${slowestTool.tool} (p95 ${ms(slowestTool.p95Ms)})`}
              />
            ) : null}
            <Detail.Metadata.Label
              title="Output volume"
              text={bytes(stats.outputBytes)}
            />
            <Detail.Metadata.TagList title="By risk">
              {(Object.entries(stats.byRisk) as [Risk, number][])
                .filter(([, n]) => n > 0)
                .map(([r, n]) => (
                  <Detail.Metadata.TagList.Item
                    key={r}
                    text={`${r} ${n}`}
                    color={RISK_TINT[r]}
                  />
                ))}
            </Detail.Metadata.TagList>
            {devices.length ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Fleet"
                  text={`${devices.length} device${devices.length === 1 ? "" : "s"}`}
                  icon={{ source: Icon.HardDrive }}
                />
                <Detail.Metadata.TagList title="Reachability">
                  <Detail.Metadata.TagList.Item
                    text={`${online} online`}
                    color={Color.Green}
                  />
                  {offline > 0 ? (
                    <Detail.Metadata.TagList.Item
                      text={`${offline} offline`}
                      color={Color.Red}
                    />
                  ) : null}
                </Detail.Metadata.TagList>
                {busiestDevice ? (
                  <Detail.Metadata.Label
                    title="Busiest device"
                    text={`${busiestDevice.name} (${num(busiestDevice.activity.calls)} calls)`}
                  />
                ) : null}
              </>
            ) : null}
            {meta ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Server"
                  text={`v${meta.version} · ${meta.transport}`}
                />
                <Detail.Metadata.Label
                  title="Live clients"
                  text={num(meta.liveClients)}
                  icon={{
                    source: Icon.Dot,
                    tintColor:
                      meta.liveClients > 0 ? Color.Green : Color.SecondaryText,
                  }}
                />
              </>
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <ActionPanel.Submenu title="Time Window" icon={Icon.Clock}>
            {WINDOWS.map(([label, v]) => (
              <Action key={label} title={label} onAction={() => setWin(v)} />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
