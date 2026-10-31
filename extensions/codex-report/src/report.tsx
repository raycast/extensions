import { Detail } from "@raycast/api";
import { useState } from "react";
import { barChart, compact } from "./charts";
import { AgentSelection, Report, Metric, metrics, agentColors, agentLabels, readingSessions } from "./report-data";
import { useReport } from "./use-report";
import { activityBars } from "./activity";
import { Period, periodRange } from "./periods";
import { ReportMetadata } from "./report-metadata";
import { ReportActions } from "./report-actions";

function dashboardMarkdown(
  report: Report | undefined,
  title: string,
  metric: Metric,
  dates: string[],
  groupWeeks: boolean,
  error?: string,
): string {
  if (!report) return error ? "## Report Unavailable\n\nPress ⌘R to try again." : `## ${title}\n\n${readingSessions}`;
  const unit = metrics[metric];
  const legend = report.selectedAgents.map((value) => ({ label: agentLabels[value], color: agentColors[value] }));
  return [
    `## ${title}\n${compact(report.messages)} Messages · ${compact(report.tokens.total_tokens)} Tokens · ${report.sessions} Sessions`,
    report.sessions === 0
      ? "No activity in this period yet. Sessions are read from `~/.codex` (Codex) and `~/.claude` (Claude Code)."
      : barChart(`Activity · ${unit}`, activityBars(dates, report, metric, groupWeeks), legend),
    metric === "costs" ? "Estimated API costs · unpriced usage excluded; partial totals are marked." : "",
    metric === "costs" ? (report.costAssumptions ?? []).join("\n\n") : "",
    error ? "Refresh failed. Showing the last successful report." : "",
  ].join("\n\n");
}

export default function Command() {
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);
  const [agent, setAgent] = useState<AgentSelection>("all");
  const [metric, setMetric] = useState<Metric>("tokens");
  const { from, to, dates, title: periodTitle } = periodRange(period, offset);
  const { report, loading, error, refresh } = useReport(from, to, agent, "repositories");
  const title = `${periodTitle} · ${agentLabels[agent]}`;
  function changePeriod(next: Period) {
    setPeriod(next);
    setOffset(0);
  }
  const movePeriod = (direction: number) => setOffset((value) => value + direction);
  return (
    <Detail
      isLoading={loading}
      markdown={dashboardMarkdown(report, title, metric, dates, period === "month", error)}
      metadata={<ReportMetadata report={report} agent={agent} onSelect={setAgent} />}
      actions={
        <ReportActions
          report={report}
          title={title}
          period={period}
          agent={agent}
          metric={metric}
          dates={dates}
          error={error}
          refresh={refresh}
          setAgent={setAgent}
          changePeriod={changePeriod}
          setMetric={setMetric}
          offset={offset}
          movePeriod={movePeriod}
        />
      }
    />
  );
}
