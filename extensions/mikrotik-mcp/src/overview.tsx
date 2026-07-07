/**
 * Overview command — mirrors the dashboard's Overview tab: tool-call volume,
 * latency, error rate and per-risk / per-tool / per-device breakdowns for a
 * selectable time window. Charts are rendered with the native substitutes
 * (unicode sparkline for the activity series, colored tags for the risk donut).
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
import { RISK_COLOR, RISK_TINT, WINDOWS, bytes, ms, num } from "./lib/format";
import { barChart, chartImage, donutChart, multiAreaChart } from "./lib/charts";
import { useApi } from "./lib/hooks";
import type { Meta, Risk, Stats } from "./lib/types";

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

  const winLabel = WINDOWS.find(([, v]) => v === win)?.[0] ?? `${win}ms`;
  const errPct = stats
    ? (stats.errorRate * 100).toFixed(stats.errorRate >= 0.05 ? 1 : 2)
    : "0";

  const activity =
    stats && stats.series.length
      ? multiAreaChart([
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
        ])
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

  const recentErrors =
    stats && stats.recentErrors.length
      ? `## Recent errors\n\n${stats.recentErrors
          .slice(0, 6)
          .map((e) => `- \`${e.tool}\` — ${e.error}`)
          .join("\n")}`
      : "";

  const markdown = stats
    ? [
        `# Overview · ${winLabel}`,
        activity
          ? `\n### Calls over time\n\n${chartImage(activity, "activity")}`
          : "",
        riskDonut ? `\n### By risk\n\n${chartImage(riskDonut, "risk")}` : "",
        toolBars ? `\n### Top tools\n\n${chartImage(toolBars, "tools")}` : "",
        recentErrors ? `\n${recentErrors}` : "",
      ].join("\n")
    : "Loading dashboard metrics…\n\nSet the **Dashboard URL** and **Access Token** in extension preferences if this stays empty.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="MikroTik MCP — Overview"
      metadata={
        stats ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Window" text={winLabel} />
            <Detail.Metadata.Label title="Calls" text={num(stats.total)} />
            <Detail.Metadata.Label
              title="Calls / min"
              text={stats.callsPerMin.toFixed(1)}
            />
            <Detail.Metadata.Label
              title="Error rate"
              text={`${errPct}% (${stats.errors})`}
              icon={{ source: Icon.Dot, tintColor: errColor(stats.errorRate) }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Avg latency"
              text={ms(stats.latency.avg)}
            />
            <Detail.Metadata.Label
              title="p95 latency"
              text={ms(stats.latency.p95)}
            />
            <Detail.Metadata.Label
              title="p99 latency"
              text={ms(stats.latency.p99)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Distinct tools"
              text={num(stats.distinctTools)}
            />
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
            {stats.byDevice.length ? (
              <Detail.Metadata.TagList title="By device">
                {stats.byDevice.slice(0, 8).map((d) => (
                  <Detail.Metadata.TagList.Item
                    key={d.device}
                    text={`${d.device} ${d.count}`}
                  />
                ))}
              </Detail.Metadata.TagList>
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
