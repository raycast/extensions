import { Action, ActionPanel, Detail, Icon, environment, Keyboard } from "@raycast/api";
import { useState } from "react";
import { compact } from "./charts";
import { imageMarkdown } from "./svg";
import { AgentSelection, Metric, agentColors, agentLabels, metrics, money, readingSessions } from "./report-data";
import { useReport } from "./use-report";
import { HeatmapPeriod, HeatmapView, buildHeatmap, heatmapRange } from "./heatmap-data";
import { heatmapImage } from "./heatmap-chart";
import { HeatmapDetails } from "./heatmap-details";
import { ExportPngAction } from "./export-png";

export default function HeatmapCommand() {
  const [period, setPeriod] = useState<HeatmapPeriod>("sixMonths");
  const [view, setView] = useState<HeatmapView>("daily");
  const [offset, setOffset] = useState(0);
  const [agent, setAgent] = useState<AgentSelection>("all");
  const [metric, setMetric] = useState<Metric>("tokens");
  const range = heatmapRange(period, offset);
  // Load all agents and all history once so filters and window switches never wait for the CLI.
  const { report, loading, error, refresh } = useReport("null", undefined, "all", "activity");
  const map = report ? buildHeatmap(report, range, agent, metric) : undefined;
  const formatValue = metric === "costs" ? money : compact;
  const image = map ? heatmapImage(map, environment.appearance === "dark", formatValue, view) : undefined;
  const activeDays = map?.cells.filter((cell) => cell.inRange && cell.value > 0).length ?? 0;
  const total = map?.cells.filter((cell) => cell.inRange).reduce((sum, cell) => sum + cell.value, 0) ?? 0;
  const unpriced = map?.cells.some((cell) => cell.inRange && cell.cost.unpricedTokens > 0);
  const costNote =
    metric === "costs"
      ? `API-equivalent estimates; unpriced usage is excluded.${unpriced ? " This is a partial estimate." : ""} See ${view === "daily" ? "Daily" : "Weekly"} Activity for coverage.`
      : "";
  const note =
    view === "weekly"
      ? "Grey = zero usage. Blocks approximate usage shares, rounded to whole blocks: Codex below, Claude above. Small shares may round to zero; see Weekly Activity for exact values. The scale stays fixed across agent filters."
      : "Grey = zero usage. Color shows the dominant agent for the selected metric; purple indicates equal shares. The scale stays fixed across agent filters.";
  const viewNote =
    view === "daily"
      ? "Intensity shows the daily total."
      : "Weekly totals fill 1–7 blocks on a square-root scale; the strongest combined week sets the height scale. Boundary weeks include only dates in this window.";
  const markdown = [
    `## ${range.title} · ${agentLabels[agent]}
${range.from} — ${range.to}`,
    image
      ? imageMarkdown("Activity heatmap", image, period === "year" ? 1000 : image.width)
      : error
        ? "Could not load activity. Press ⌘R to retry."
        : readingSessions,
    `${activeDays} active days · ${formatValue(total)} ${metrics[metric].toLowerCase()}`,
    report?.sessions === 0
      ? "No local sessions found. Codex Report reads Codex sessions from `~/.codex` and Claude Code sessions from `~/.claude`."
      : "",
    loading && report ? "Updating local sessions… Showing the last successful report." : "",
    viewNote,
    note,
    costNote,
    error && report ? "Refresh failed. Showing the last successful report." : "",
  ].join("\n\n");
  function changePeriod(value: HeatmapPeriod) {
    setPeriod(value);
    setOffset(0);
  }
  // Store guidelines keep the root command title; only the dashboard's pushed heatmap gets its own.
  return (
    <Detail
      isLoading={loading}
      navigationTitle={environment.entryPointName === "heatmap" ? undefined : "Activity Heatmap"}
      markdown={markdown}
      actions={
        <ActionPanel>
          {map && (
            <Action.Push
              title={`Show ${view === "daily" ? "Daily" : "Weekly"} Activity`}
              icon={Icon.Calendar}
              target={<HeatmapDetails map={map} view={view} formatValue={formatValue} />}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <ActionPanel.Section title="Agents">
            {(["all", "codex", "claude"] as AgentSelection[]).map((value, index) => (
              <Action
                key={value}
                title={`Show ${agentLabels[value]}`}
                icon={{
                  source: value === agent ? Icon.CheckCircle : Icon.Circle,
                  tintColor: value === "all" ? undefined : agentColors[value],
                }}
                shortcut={{ modifiers: ["cmd"], key: String(index + 4) as "4" | "5" | "6" }}
                onAction={() => setAgent(value)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={`Switch to ${view === "daily" ? "Weekly" : "Daily"}`}
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              onAction={() => setView((value) => (value === "daily" ? "weekly" : "daily"))}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Window">
            <Action
              title="Show 6 Months"
              icon={period === "sixMonths" && offset === 0 ? Icon.CheckCircle : Icon.Calendar}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              onAction={() => changePeriod("sixMonths")}
            />
            <Action
              title="Show Current Year"
              icon={period === "year" && offset === 0 ? Icon.CheckCircle : Icon.Calendar}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => changePeriod("year")}
            />
            <Action
              title="Previous Window"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={() => setOffset((value) => value - 1)}
            />
            {offset < 0 && (
              <Action
                title="Next Window"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => setOffset((value) => value + 1)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Metric">
            {(Object.keys(metrics) as Metric[]).map((value) => (
              <Action
                key={value}
                title={`Show ${metrics[value]}`}
                icon={metric === value ? Icon.CheckCircle : Icon.BarChart}
                onAction={() => setMetric(value)}
              />
            ))}
          </ActionPanel.Section>
          {image && report && (
            <ExportPngAction
              card={{
                title: `${range.title} · ${agentLabels[agent]}`,
                subtitle: `${range.from} — ${range.to}`,
                chart: image,
                generatedAt: report.generatedAt,
                stats: [
                  { label: metrics[metric], value: formatValue(total) },
                  { label: "Active Days", value: String(activeDays) },
                ],
                note: `${viewNote} ${note} ${costNote}`,
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
