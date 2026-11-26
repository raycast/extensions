// DAG performance: run duration stats over the last N runs, health, sparkline, per-task table.
// Same cached loader feeds the Tasks / Task History views, so drilling in is instant.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DagPerf, loadDagPerf } from "../lib/perf-data";
import { formatDuration, formatTimestamp, relativeTime } from "../lib/format";
import { pct, regression, runSeconds } from "../lib/stats";
import { durationChart, stateGrid, taskTimingChart } from "../lib/charts";
import { chartMarkdown, chartTheme } from "../lib/chart-image";
import { clientFor, errorText, tierColor } from "../lib/raycast";
import { ComposerEnvironment } from "../lib/types";
import { DagDetail } from "./dag-detail";
import { DagRuns } from "./dag-runs";
import { DagTasks } from "./dag-tasks";
import { EnvironmentActions, crumbs, refreshShortcut } from "./env-actions";
import { DagLineage } from "./lineage";
import { LineageGraphView } from "./lineage-graph";

export const RUN_WINDOWS = [25, 50, 100, 200];

export function useDagPerf(env: ComposerEnvironment, dagId: string, lastRuns: number) {
  return useCachedPromise(
    (uri: string, id: string, n: number) => loadDagPerf(clientFor({ airflowUri: uri }), id, n),
    [env.airflowUri, dagId, lastRuns],
    { keepPreviousData: true },
  );
}

/** Report markdown: alerts + SVG charts (run durations, task timings, task × run state grid). */
export function perfMarkdown(dagId: string, p: DagPerf, mode: "file" | "data" = "file"): string {
  const theme = chartTheme();
  const secs = p.chronological.map(runSeconds);
  const finished = secs.filter((x): x is number => x !== undefined);
  const reg = regression(finished);
  const s = p.runSummary;
  const h = p.health;
  const lines: string[] = [];
  if (reg?.flagged) lines.push(`> ⚠️ **Latest run took ${reg.ratio.toFixed(1)}× the median** of the previous runs.`);
  if (h.greenWithFailedTasks)
    lines.push(
      `> ⚠️ **${h.greenWithFailedTasks} green run(s) contain failed tasks** — run state overstates health (all_done leaf).`,
    );
  lines.push(
    `**${p.runs.length} runs** · ${pct(h.success, h.finished)} run success · p50 **${formatDuration(
      s?.p50,
    )}** · p90 **${formatDuration(s?.p90)}** · max ${formatDuration(s?.max)}`,
  );
  lines.push(
    chartMarkdown(
      durationChart(
        p.chronological.map((r) => ({
          seconds: runSeconds(r),
          state: r.state,
          label: formatTimestamp(r.start_date ?? r.execution_date).slice(0, 10),
        })),
        { theme, p50: s?.p50, p90: s?.p90, title: "Run duration (oldest → newest)" },
      ),
      { alt: "run durations", width: 680, mode },
    ),
  );
  const tasks = [...p.tasks]
    .filter((t) => t.summary)
    .sort((a, b) => (b.summary?.p50 ?? -1) - (a.summary?.p50 ?? -1))
    .slice(0, 18);
  if (tasks.length)
    lines.push(
      chartMarkdown(
        taskTimingChart(
          tasks.map((t) => ({
            name: `${t.taskId}${t.mapped ? " ⧉" : ""}`,
            p50: t.summary?.p50,
            p90: t.summary?.p90,
            max: t.summary?.max,
            failed: t.failedRuns,
            flagged: t.regression?.flagged,
          })),
          { theme, title: `Where the time goes (top ${tasks.length} tasks by median)` },
        ),
        { alt: "task timings", width: 680, mode },
      ),
    );
  // grid: tasks in execution order (first seen start), last 40 runs
  const runs = p.chronological.slice(-40);
  const ordered = [...p.tasks]
    .sort((a, b) => (a.points[0]?.start ?? "").localeCompare(b.points[0]?.start ?? ""))
    .slice(0, 25);
  if (ordered.length && runs.length) {
    const cells = ordered.map((t) => {
      const byRun = new Map(t.points.map((pt) => [pt.runId, pt.state]));
      return runs.map((r) => byRun.get(r.dag_run_id));
    });
    lines.push(
      chartMarkdown(
        stateGrid(
          ordered.map((t) => t.taskId),
          cells,
          {
            theme,
            title: "Task × run grid",
            colLabels: [
              formatTimestamp(runs[0].start_date).slice(0, 10),
              formatTimestamp(runs[runs.length - 1].start_date).slice(0, 10),
            ],
          },
        ),
        { alt: "task grid", width: 680, mode },
      ),
    );
  }
  if (p.tisCapped) lines.push(`_Task instances capped at ${p.tis.length} of ${p.tisTotal}._`);
  return lines.join("\n\n");
}

export function DagPerformance(props: { env: ComposerEnvironment; dagId: string; lastRuns?: number }) {
  const { env, dagId } = props;
  const [n, setN] = useState(props.lastRuns ?? 50);
  const { data, isLoading, error, revalidate } = useDagPerf(env, dagId, n);
  const slowest = data ? [...data.tasks].sort((a, b) => (b.summary?.p50 ?? 0) - (a.summary?.p50 ?? 0))[0] : undefined;
  const md = error
    ? `# ${dagId}\n\n> ⚠️ ${errorText(error)}`
    : data
      ? perfMarkdown(dagId, data)
      : `# ${dagId}\n\n_Loading last ${n} runs and their task instances…_`;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={crumbs(env.id, dagId, "performance")}
      markdown={md}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Environment">
              <Detail.Metadata.TagList.Item text={env.id} color={tierColor(env)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Window" text={`last ${data.runs.length} runs`} />
            <Detail.Metadata.Label
              title="Span"
              text={`${formatTimestamp(data.chronological[0]?.start_date)} → ${relativeTime(data.runs[0]?.start_date)}`}
            />
            <Detail.Metadata.TagList title="Success">
              <Detail.Metadata.TagList.Item
                text={pct(data.health.success, data.health.finished)}
                color={data.health.failed ? Color.Orange : Color.Green}
              />
              {data.health.greenWithFailedTasks ? (
                <Detail.Metadata.TagList.Item
                  text={`${data.health.greenWithFailedTasks} green w/ failed tasks`}
                  color={Color.Red}
                />
              ) : null}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="p50 / p90"
              text={`${formatDuration(data.runSummary?.p50)} / ${formatDuration(data.runSummary?.p90)}`}
            />
            {slowest && (
              <Detail.Metadata.Label
                title="Slowest Task (p50)"
                text={`${slowest.taskId} · ${formatDuration(slowest.summary?.p50)}`}
              />
            )}
            <Detail.Metadata.Label
              title="Task Instances"
              text={`${data.tis.length}${data.tisCapped ? ` of ${data.tisTotal}` : ""}`}
            />
            <Detail.Metadata.Link title="Airflow" target={clientFor(env).uiDagUrl(dagId)} text="Open grid" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Drill In">
            <Action.Push
              title="Task Breakdown"
              icon={Icon.BarChart}
              shortcut={hotkey(["cmd"], "t")}
              target={<DagTasks env={env} dagId={dagId} lastRuns={n} />}
            />
            <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={dagId} />} />
            <Action.Push
              title="Dataset Lineage"
              icon={Icon.Network}
              shortcut={hotkey(["cmd"], "l")}
              target={<DagLineage env={env} dagId={dagId} />}
            />
            <Action.Push
              title="Lineage Graph"
              icon={Icon.Switch}
              shortcut={hotkey(["cmd"], "g")}
              target={<LineageGraphView env={env} dagId={dagId} />}
            />
            <Action.Push
              title="DAG Details"
              icon={Icon.Info}
              shortcut={hotkey(["cmd"], "i")}
              target={<DagDetail env={env} dagId={dagId} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Submenu title="Window…" icon={Icon.Calendar} shortcut={hotkey(["cmd"], "y")}>
            {RUN_WINDOWS.map((w) => (
              <Action key={w} title={`Last ${w} Runs`} onAction={() => setN(w)} />
            ))}
          </ActionPanel.Submenu>
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
          <Action.OpenInBrowser
            title="Open DAG in Airflow"
            url={clientFor(env).uiDagUrl(dagId)}
            shortcut={hotkey(["cmd"], "o")}
          />
          {data && <Action.CopyToClipboard title="Copy Report Markdown" content={perfMarkdown(dagId, data)} />}
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}
