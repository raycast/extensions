import type { ProbeResponse, ToolInfo } from "./types";
import { stringify } from "./json";

export function formatCost(tool: ToolInfo): string {
  if (tool.expected_cost !== undefined && tool.expected_cost !== null) return String(tool.expected_cost);
  if (tool.cost_class) return tool.cost_class;
  if (tool.billing_rule) return stringify(tool.billing_rule).replace(/\s+/g, " ");
  return "Not provided";
}

export function formatReliability(tool: ToolInfo): string {
  if (tool.stats?.success_rate !== undefined) return `${(tool.stats.success_rate * 100).toFixed(1)}%`;
  return tool.reliability ?? "Not provided";
}

export function formatLatency(tool: ToolInfo): string {
  if (tool.stats?.avg_execution_time_ms === undefined) return "Not provided";
  return `${Math.round(tool.stats.avg_execution_time_ms)} ms`;
}

export function formatProbeQuote(probe: ProbeResponse): string {
  const estimate = probe.quote?.estimate_credits;
  if (estimate === undefined || estimate === null) return "No exact estimate returned";
  return `${estimate} ${probe.quote?.currency ?? "credits"}${probe.quote?.exact ? " (exact)" : " (estimate)"}`;
}

export function probeError(probe: ProbeResponse): string | undefined {
  if (probe.schema?.valid !== false) return undefined;
  const violations = probe.schema.violations ?? [];
  if (violations.length === 0) return probe.schema.note ?? "The parameters do not match the current schema.";
  return violations
    .map((violation) => `${violation.param ? `${violation.param}: ` : ""}${violation.message}`)
    .join("\n");
}

export function markdownForTool(tool: ToolInfo): string {
  const sections = [
    `# ${tool.name ?? tool.capability ?? tool.tool_id}`,
    tool.description ?? "No description provided.",
    tool.why_recommended ? `## Why It Matches\n\n${tool.why_recommended}` : undefined,
    `## Parameters\n\n\`\`\`json\n${stringify(tool.params ?? [])}\n\`\`\``,
    tool.examples?.sample_parameters
      ? `## Example Parameters\n\n\`\`\`json\n${stringify(tool.examples.sample_parameters)}\n\`\`\``
      : undefined,
  ];

  return sections.filter(Boolean).join("\n\n");
}
