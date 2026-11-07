import { Detail, Icon } from "@raycast/api";
import { compact } from "./charts";
import {
  AgentSelection,
  Report,
  agentColors,
  agentLabels,
  money,
  estimatedCostTitle,
  cachedInputShare,
  fastModeShare,
} from "./report-data";

type Props = { report?: Report; agent: AgentSelection; onSelect: (agent: AgentSelection) => void };

export function ReportMetadata({ report, agent, onSelect }: Props) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Agents">
        {(["all", "codex", "claude"] as AgentSelection[]).map((value) => (
          <Detail.Metadata.TagList.Item
            key={value}
            text={`${value === agent ? "✓ " : ""}${agentLabels[value]}`}
            color={value === "all" ? undefined : agentColors[value]}
            onAction={() => onSelect(value)}
          />
        ))}
      </Detail.Metadata.TagList>
      {report && <ReportStats report={report} />}
    </Detail.Metadata>
  );
}

function ReportStats({ report }: { report: Report }) {
  return (
    <>
      {report.selectedAgents.length > 1 &&
        report.agents.map((summary) => (
          <Detail.Metadata.Label
            key={summary.agent}
            title={agentLabels[summary.agent]}
            text={`${compact(summary.tokens.total_tokens)} tokens · ${summary.sessions} sessions`}
            icon={{ source: Icon.Circle, tintColor: agentColors[summary.agent] }}
          />
        ))}
      <Detail.Metadata.Label title="Tokens" text={report.tokens.total_tokens.toLocaleString("en-US")} />
      <Detail.Metadata.Label title={estimatedCostTitle(report)} text={money(report.costEstimate.totalCost)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Sessions" text={String(report.sessions)} />
      <Detail.Metadata.Label title="Cached Input Share" text={cachedInputShare(report)} />
      <Detail.Metadata.Label title="Updated" text={new Date(report.generatedAt).toLocaleTimeString("en-US")} />
      <Detail.Metadata.Label title="Fast Mode" text={fastModeShare(report)} />
    </>
  );
}
