import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { barChartImage, compact } from "./charts";
import { activityBars } from "./activity";
import { ExportPngAction } from "./export-png";
import { Breakdown } from "./breakdown";
import {
  AgentSelection,
  Report,
  Metric,
  metrics,
  agentColors,
  agentLabels,
  money,
  estimatedCostTitle,
  cachedInputShare,
  fastModeShare,
} from "./report-data";
import { Period, periods } from "./periods";
import HeatmapCommand from "./heatmap";

type Props = {
  report?: Report;
  title: string;
  period: Period;
  agent: AgentSelection;
  metric: Metric;
  offset: number;
  movePeriod: (direction: number) => void;
  dates: string[];
  error?: string;
  refresh: () => void;
  setAgent: (agent: AgentSelection) => void;
  changePeriod: (period: Period) => void;
  setMetric: (metric: Metric) => void;
};

export function ReportActions({
  report,
  title,
  period,
  agent,
  metric,
  dates,
  error,
  refresh,
  setAgent,
  changePeriod,
  setMetric,
  offset,
  movePeriod,
}: Props) {
  return (
    <ActionPanel>
      {report && <ExploreActions report={report} title={title} />}
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
      <ActionPanel.Section title="Period">
        <Action
          title="Previous Period"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={() => movePeriod(-1)}
        />
        {offset < 0 && (
          <Action
            title="Next Period"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            onAction={() => movePeriod(1)}
          />
        )}
        {(Object.keys(periods) as Period[]).map((value, index) => (
          <Action
            key={value}
            title={periods[value]}
            icon={value === period && offset === 0 ? Icon.CheckCircle : Icon.Calendar}
            shortcut={{ modifiers: ["cmd"], key: String(index + 1) as "1" | "2" | "3" }}
            onAction={() => changePeriod(value)}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Activity Metric">
        {(Object.keys(metrics) as Metric[]).map((value) => (
          <Action
            key={value}
            title={`Show ${metrics[value]}`}
            icon={metric === value ? Icon.CheckCircle : Icon.BarChart}
            onAction={() => setMetric(value)}
          />
        ))}
      </ActionPanel.Section>
      {report && (
        <ActivityExportAction
          report={report}
          title={title}
          period={period}
          metric={metric}
          dates={dates}
          error={error}
        />
      )}
      {report && <ReportCopyActions report={report} title={title} />}
    </ActionPanel>
  );
}

function ExploreActions({ report, title }: { report: Report; title: string }) {
  return (
    <ActionPanel.Section title="Explore">
      <Action.Push title="Show Activity Heatmap" icon={Icon.Calendar} target={<HeatmapCommand />} />
      <Action.Push
        title="Show Models"
        icon={Icon.Layers}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        target={<Breakdown kind="models" report={report} period={title} />}
      />
      <Action.Push
        title="Show Costs"
        icon={Icon.Coins}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<Breakdown kind="costs" report={report} period={title} />}
      />
      <Action.Push
        title="Show Reasoning Efforts"
        icon={Icon.LightBulb}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        target={<Breakdown kind="efforts" report={report} period={title} />}
      />
      <Action.Push
        title="Show Projects"
        icon={Icon.Folder}
        target={<Breakdown kind="projects" report={report} period={title} />}
      />
    </ActionPanel.Section>
  );
}

function ActivityExportAction({
  report,
  title,
  period,
  metric,
  dates,
  error,
}: Pick<Props, "title" | "period" | "metric" | "dates" | "error"> & { report: Report }) {
  const unit = metrics[metric];
  const legend = report.selectedAgents.map((value) => ({ label: agentLabels[value], color: agentColors[value] }));
  return (
    <ExportPngAction
      card={{
        title,
        subtitle: `${report.period.from ?? "All time"} — ${report.period.to} · Activity by ${metric}`,
        generatedAt: report.generatedAt,
        stats: [
          { label: "Messages", value: report.messages.toLocaleString("en-US") },
          { label: "Tokens", value: compact(report.tokens.total_tokens) },
          { label: estimatedCostTitle(report), value: money(report.costEstimate.totalCost) },
          { label: "Sessions", value: String(report.sessions) },
          { label: "Cached Input Share", value: cachedInputShare(report) },
          { label: "Fast Mode · Known Turns", value: fastModeShare(report) },
        ],
        chart: barChartImage(`Activity · ${unit}`, activityBars(dates, report, metric, period === "month"), legend),
        note: `${error ? "Refresh failed. Showing the last successful report. " : ""}API-equivalent estimate, not subscription charges.${report.costEstimate.unpricedModels.length ? " Unpriced models are excluded." : ""}`,
      }}
    />
  );
}

function ReportCopyActions({ report, title }: { report: Report; title: string }) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Summary"
        shortcut={Keyboard.Shortcut.Common.Copy}
        content={`${title}: ${report.messages.toLocaleString("en-US")} messages · ${compact(report.tokens.total_tokens)} tokens · ${report.sessions} sessions · ${money(report.costEstimate.totalCost)} estimated API cost${report.costEstimate.unpricedModels.length ? " (partial)" : ""}`}
      />
      <Action.CopyToClipboard title="Copy Report as JSON" content={JSON.stringify(report, null, 2)} />
    </>
  );
}
