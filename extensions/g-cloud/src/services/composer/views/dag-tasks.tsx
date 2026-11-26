// DAG -> Tasks (one row per task with duration stats) -> Task History (that task across runs)
// -> Log. Uses the same cached loader as DagPerformance.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { matches, parseSearch } from "../lib/filter";
import { formatDuration, formatTimestamp, relativeTime } from "../lib/format";
import { TaskStats } from "../lib/stats";
import { clientFor, errorText, stateIcon } from "../lib/raycast";
import { ComposerEnvironment } from "../lib/types";
import { RUN_WINDOWS, useDagPerf } from "./dag-performance";
import { DurationDetail, barLabel, compactFlags } from "./chart-detail";
import { EnvironmentActions, FilterSubmenu, NavigateSection, crumbs, refreshShortcut } from "./env-actions";
import { MappedTaskInstances, TaskInstances, TaskLinks } from "./task-instances";
import { TaskLog } from "./task-log";

type SortKey = "p50" | "p90" | "max" | "fails" | "name";

function sortTasks(tasks: TaskStats[], key: SortKey): TaskStats[] {
  const v = (t: TaskStats) =>
    key === "fails" ? t.failedRuns : key === "name" ? 0 : (t.summary?.[key as "p50" | "p90" | "max"] ?? -1);
  return [...tasks].sort((a, b) => (key === "name" ? a.taskId.localeCompare(b.taskId) : v(b) - v(a)));
}

export function DagTasks(props: { env: ComposerEnvironment; dagId: string; lastRuns?: number }) {
  const { env, dagId } = props;
  const [n, setN] = useState(props.lastRuns ?? 50);
  const [sort, setSort] = useState<string>("p50");
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const { data, isLoading, error, revalidate } = useDagPerf(env, dagId, n);
  const parsed = parseSearch(searchText);
  const tasks = sortTasks(data?.tasks ?? [], sort as SortKey).filter((t) =>
    matches(
      parsed,
      {
        task: [t.taskId],
        op: [t.operator],
        is: [
          t.mapped ? "mapped" : "",
          t.failedRuns ? "failed" : "",
          t.regression?.flagged ? "slow" : "",
          t.retriedRuns ? "retried" : "",
        ],
      },
      [t.taskId, t.operator],
    ),
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={crumbs(dagId, "tasks", data ? `last ${data.runs.length} runs` : undefined)}
      searchBarPlaceholder="Filter tasks…  is:failed  is:slow  is:mapped  op:Bash"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sort} onChange={setSort}>
          <List.Dropdown.Item title="Sort: Median Duration" value="p50" />
          <List.Dropdown.Item title="Sort: p90 Duration" value="p90" />
          <List.Dropdown.Item title="Sort: Max Duration" value="max" />
          <List.Dropdown.Item title="Sort: Failures" value="fails" />
          <List.Dropdown.Item title="Sort: Name" value="name" />
        </List.Dropdown>
      }
    >
      {error && (
        <List.EmptyView icon={Icon.Warning} title="Could not load task history" description={errorText(error)} />
      )}
      <List.Section title="Tasks" subtitle={`${tasks.length} · p50 / p90 over last ${data?.runs.length ?? n} runs`}>
        {tasks.map((t) => {
          const acc: List.Item.Accessory[] = [];
          if (t.regression?.flagged)
            acc.push({
              tag: { value: `${t.regression.ratio.toFixed(1)}× slower`, color: Color.Orange },
              tooltip: "Latest vs median of earlier runs",
            });
          const flags = [
            t.mapped ? "mapped" : "",
            t.failedRuns ? `${t.failedRuns} failed` : "",
            t.retriedRuns ? `${t.retriedRuns} retried` : "",
          ].filter(Boolean);
          if (flags.length)
            acc.push({
              tag: {
                value: flags.join(" · "),
                color: t.failedRuns ? Color.Red : t.retriedRuns ? Color.Yellow : Color.Purple,
              },
            });
          if (!showDetail)
            acc.push({
              text: `${formatDuration(t.summary?.p50)} / ${formatDuration(t.summary?.p90)}`,
              icon: Icon.Stopwatch,
              tooltip: `p50 / p90 · max ${formatDuration(t.summary?.max)} · n=${t.summary?.n ?? 0}${
                t.operator ? ` · ${t.operator}` : ""
              }`,
            });
          const last = t.points[t.points.length - 1];
          return (
            <List.Item
              key={t.taskId}
              icon={stateIcon(last?.state)}
              title={t.taskId}
              keywords={t.operator ? [t.operator] : undefined}
              accessories={
                showDetail
                  ? compactFlags({
                      failed: t.failedRuns,
                      slowRatio: t.regression?.flagged ? t.regression.ratio : undefined,
                      retried: t.retriedRuns,
                      mapped: t.mapped,
                    })
                  : acc
              }
              detail={
                <DurationDetail
                  heading={t.taskId}
                  subheading={`last ${t.points.length} runs · oldest → newest`}
                  bars={t.points.map((pt) => ({ seconds: pt.seconds, state: pt.state, label: barLabel(pt.start) }))}
                  summary={t.summary}
                  facts={[
                    ...(t.operator ? [{ title: "Operator", text: t.operator }] : []),
                    {
                      title: "Failed Runs",
                      tag: { text: String(t.failedRuns), color: t.failedRuns ? Color.Red : Color.Green },
                    },
                    { title: "Retried Runs", text: String(t.retriedRuns) },
                    ...(t.mapped ? [{ title: "Mapped", text: "one point per run = wall-clock span" }] : []),
                    ...(t.regression
                      ? [
                          {
                            title: "Latest vs Median",
                            tag: {
                              text: `${t.regression.ratio.toFixed(1)}×`,
                              color: t.regression.flagged ? Color.Orange : Color.SecondaryText,
                            },
                          },
                        ]
                      : []),
                  ]}
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Drill In">
                    <Action.Push
                      title="Task History"
                      icon={Icon.List}
                      target={<TaskHistory env={env} dagId={dagId} stats={t} />}
                    />
                    {last && (
                      <Action.Push
                        title="Latest Log"
                        icon={Icon.Terminal}
                        shortcut={hotkey(["cmd"], "l")}
                        target={<TaskLog env={env} ti={last.sample} />}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Filter">
                    <FilterSubmenu
                      searchText={searchText}
                      setSearchText={setSearchText}
                      options={[
                        { key: "is", value: "failed", title: "Has Failures" },
                        { key: "is", value: "slow", title: "Latest ≥ 2× Median" },
                        { key: "is", value: "retried", title: "Retried" },
                        { key: "is", value: "mapped", title: "Mapped" },
                        ...(t.operator
                          ? [{ key: "op" as const, value: t.operator, title: `Operator: ${t.operator}` }]
                          : []),
                      ]}
                    />
                  </ActionPanel.Section>
                  <NavigateSection upTitle="Performance">
                    <Action
                      title={showDetail ? "Hide Chart Panel" : "Show Chart Panel"}
                      icon={Icon.Sidebar}
                      shortcut={hotkey(["cmd"], "d")}
                      onAction={() => setShowDetail((v) => !v)}
                    />
                    <ActionPanel.Submenu title="Window…" icon={Icon.Calendar} shortcut={hotkey(["cmd"], "y")}>
                      {RUN_WINDOWS.map((w) => (
                        <Action key={w} title={`Last ${w} Runs`} onAction={() => setN(w)} />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={refreshShortcut}
                      onAction={revalidate}
                    />
                  </NavigateSection>
                  <Action.CopyToClipboard
                    title="Copy Task ID"
                    content={t.taskId}
                    shortcut={hotkey(["cmd", "shift"], "c")}
                  />
                  <EnvironmentActions env={env} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** One task across runs, newest first, with duration vs its own median. */
export function TaskHistory(props: { env: ComposerEnvironment; dagId: string; stats: TaskStats }) {
  const { env, dagId, stats } = props;
  const [filter, setFilter] = useState("all");
  const p50 = stats.summary?.p50;
  const points = [...stats.points]
    .reverse()
    .filter(
      (p) =>
        filter === "all" ||
        (filter === "failed"
          ? ["failed", "upstream_failed"].includes(p.state)
          : filter === "slow"
            ? !!(p.seconds && p50 && p.seconds >= 2 * p50)
            : true),
    );
  return (
    <List
      navigationTitle={crumbs(dagId, stats.taskId, `${stats.points.length} runs`)}
      searchBarPlaceholder="Filter by run id…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Runs" value="all" />
          <List.Dropdown.Item title="Failed" value="failed" />
          <List.Dropdown.Item title="Slow (≥ 2× median)" value="slow" />
        </List.Dropdown>
      }
    >
      <List.Section
        title={stats.taskId}
        subtitle={`p50 ${formatDuration(p50)} · p90 ${formatDuration(stats.summary?.p90)} · max ${formatDuration(
          stats.summary?.max,
        )}`}
      >
        {points.map((p) => {
          const delta = p.seconds !== undefined && p50 ? (p.seconds - p50) / p50 : undefined;
          const acc: List.Item.Accessory[] = [];
          if (p.instances > 1)
            acc.push({
              tag: {
                value: `${p.instances} mapped${p.failedInstances ? ` · ${p.failedInstances} failed` : ""}`,
                color: Color.Purple,
              },
            });
          if (p.tries > 1) acc.push({ tag: { value: `try ${p.tries}`, color: Color.Orange } });
          if (delta !== undefined && Math.abs(delta) >= 0.25)
            acc.push({
              tag: {
                value: `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`,
                color: delta > 0 ? Color.Orange : Color.Green,
              },
            });
          acc.push({ text: formatDuration(p.seconds), icon: Icon.Stopwatch });
          acc.push({ text: relativeTime(p.start), tooltip: formatTimestamp(p.start) });
          return (
            <List.Item
              key={p.runId}
              icon={stateIcon(p.state)}
              title={formatTimestamp(p.start)}
              subtitle={p.runId}
              keywords={[p.runId, p.state]}
              accessories={acc}
              actions={
                <ActionPanel>
                  {p.instances > 1 ? (
                    <Action.Push
                      title="Show Mapped Instances"
                      icon={Icon.List}
                      target={<MappedTaskInstances env={env} dagId={dagId} runId={p.runId} taskId={stats.taskId} />}
                    />
                  ) : (
                    <Action.Push title="Show Log" icon={Icon.Terminal} target={<TaskLog env={env} ti={p.sample} />} />
                  )}
                  {p.instances > 1 && (
                    <Action.Push
                      title="Log of Worst Instance"
                      icon={Icon.Terminal}
                      shortcut={hotkey(["cmd"], "l")}
                      target={<TaskLog env={env} ti={p.sample} />}
                    />
                  )}
                  <Action.Push
                    title="All Tasks in This Run"
                    icon={Icon.List}
                    shortcut={hotkey(["cmd", "shift"], "w")}
                    target={<TaskInstances env={env} dagId={dagId} runId={p.runId} />}
                  />
                  <Action.Push
                    title="XCom & Links"
                    icon={Icon.Link}
                    shortcut={hotkey(["cmd", "shift"], "x")}
                    target={<TaskLinks env={env} ti={p.sample} />}
                  />
                  <Action.OpenInBrowser
                    title="Open in Airflow"
                    url={clientFor(env).uiTaskUrl(dagId, p.runId, stats.taskId)}
                    shortcut={hotkey(["cmd"], "o")}
                  />
                  <NavigateSection upTitle="Tasks" />
                  <EnvironmentActions env={env} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** Load the DAG's task stats, then show one task's history (entry from a task-instance row). */
export function TaskHistoryFor(props: { env: ComposerEnvironment; dagId: string; taskId: string }) {
  const { data, isLoading, error } = useDagPerf(props.env, props.dagId, 50);
  const stats = data?.tasks.find((t) => t.taskId === props.taskId);
  if (stats) return <TaskHistory env={props.env} dagId={props.dagId} stats={stats} />;
  return (
    <List isLoading={isLoading} navigationTitle={crumbs(props.dagId, props.taskId)} searchBarPlaceholder="Filter…">
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Clock}
        title={error ? "Could not load history" : isLoading ? "Loading last 50 runs…" : "Task not in the last 50 runs"}
        description={error ? errorText(error) : undefined}
      />
    </List>
  );
}
