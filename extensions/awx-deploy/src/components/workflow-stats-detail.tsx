import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { WorkflowJob, WorkflowJobNode, apiBase, fetchAll, workflowTemplateWebUrl } from "../common/awx";
import { formatElapsed, statusColor } from "../common/format";
import { DurationStats, durationStats, tally } from "../common/stats";

const WINDOW_DAYS = 7;
/** Cap how many runs we drill into for per-stage timing, to bound API calls. */
const STAGE_DRILL_CAP = 100;

interface StageStat {
  name: string;
  stats: DurationStats;
}

interface ComputedStats {
  overall: DurationStats | null;
  statuses: Array<[string, number]>;
  users: Array<[string, number]>;
  perDay: Array<[string, number]>;
  stages: StageStat[];
  capped: boolean;
}

export function WorkflowStatsDetail({
  template,
  jobs,
}: {
  template: { id: number; name: string };
  jobs: WorkflowJob[];
}) {
  const { data, isLoading } = usePromise((jobsArg: WorkflowJob[]) => computeStats(jobsArg), [jobs]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${template.name} · Stats`}
      markdown={data ? renderMarkdown(template.name, jobs.length, data) : "Crunching numbers…"}
      metadata={data ? renderMetadata(jobs.length, data) : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in AWX" url={workflowTemplateWebUrl(template.id)} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}

async function computeStats(jobs: WorkflowJob[]): Promise<ComputedStats> {
  const overall = durationStats(jobs.map((j) => j.elapsed));
  const statuses = tally(jobs.map((j) => j.status));
  const users = tally(jobs.map((j) => j.summary_fields?.created_by?.username ?? `(${j.launch_type ?? "system"})`));
  const perDay = tally(jobs.map((j) => j.created.slice(0, 10))).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const drill = jobs.slice(0, STAGE_DRILL_CAP);
  const nodeLists = await Promise.all(
    drill.map((j) =>
      fetchAll<WorkflowJobNode>(`${apiBase()}/workflow_jobs/${j.id}/workflow_nodes/?page_size=200`).catch(() => []),
    ),
  );

  const stageDurations = new Map<string, number[]>();
  for (const nodes of nodeLists) {
    for (const node of nodes) {
      const name = node.summary_fields?.unified_job_template?.name;
      const elapsed = node.summary_fields?.job?.elapsed;
      if (!name || !elapsed || elapsed <= 0) continue;
      const list = stageDurations.get(name) ?? [];
      list.push(elapsed);
      stageDurations.set(name, list);
    }
  }

  const stages: StageStat[] = [];
  for (const [name, values] of stageDurations) {
    const stats = durationStats(values);
    if (stats) stages.push({ name, stats });
  }
  stages.sort((a, b) => b.stats.mean - a.stats.mean);

  return { overall, statuses, users, perDay, stages, capped: jobs.length > STAGE_DRILL_CAP };
}

function successRate(statuses: Array<[string, number]>): string {
  const total = statuses.reduce((sum, [, c]) => sum + c, 0);
  if (total === 0) return "—";
  const ok = statuses.find(([s]) => s === "successful")?.[1] ?? 0;
  return `${Math.round((ok / total) * 100)}%`;
}

function renderMetadata(runCount: number, data: ComputedStats) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title={`Runs (last ${WINDOW_DAYS}d)`} text={String(runCount)} />
      <Detail.Metadata.Label title="Mean" text={data.overall ? formatElapsed(data.overall.mean) : "—"} />
      <Detail.Metadata.Label title="Median" text={data.overall ? formatElapsed(data.overall.median) : "—"} />
      <Detail.Metadata.Label title="Success rate" text={successRate(data.statuses)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Status">
        {data.statuses.map(([status, count]) => (
          <Detail.Metadata.TagList.Item key={status} text={`${status} · ${count}`} color={statusColor(status)} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function statRow(label: string, s: DurationStats): string {
  return `| ${label} | ${s.count} | ${formatElapsed(s.mean)} | ${formatElapsed(s.median)} | ${formatElapsed(s.p90)} | ${formatElapsed(s.min)} | ${formatElapsed(s.max)} | ${formatElapsed(s.stddev)} |`;
}

function renderMarkdown(name: string, runCount: number, data: ComputedStats): string {
  const lines: string[] = [];
  lines.push(`# ${name}`);
  lines.push("");
  lines.push(
    `Executions in the last **${WINDOW_DAYS} days**: **${runCount}** (~${(runCount / WINDOW_DAYS).toFixed(1)}/day)`,
  );
  lines.push("");

  lines.push("## Duration");
  if (data.overall) {
    lines.push("| Scope | Runs | Mean | Median | P90 | Min | Max | Std Dev |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    lines.push(statRow("Workflow", data.overall));
    lines.push("");
    lines.push(`Total compute time: **${formatElapsed(data.overall.total)}**`);
  } else {
    lines.push("_No finished runs with a measurable duration._");
  }
  lines.push("");

  if (data.stages.length > 0) {
    lines.push("## Stage durations (sub-nodes)");
    lines.push("| Stage | Runs | Mean | Median | P90 | Min | Max | Std Dev |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const stage of data.stages) {
      lines.push(statRow(stage.name, stage.stats));
    }
    if (data.capped) {
      lines.push("");
      lines.push(`_Stage stats sampled from the ${STAGE_DRILL_CAP} most recent runs._`);
    }
    lines.push("");
  }

  lines.push("## Users");
  lines.push("| User | Runs |");
  lines.push("| --- | --- |");
  for (const [user, count] of data.users) {
    lines.push(`| ${user} | ${count} |`);
  }
  lines.push("");

  lines.push("## Frequency by day");
  lines.push("| Day | Runs |");
  lines.push("| --- | --- |");
  for (const [day, count] of data.perDay) {
    lines.push(`| ${day} | ${count} |`);
  }

  return lines.join("\n");
}
