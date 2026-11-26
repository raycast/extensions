// Top-level performance: DAGs in an environment ranked over a time window (one capped batch
// query of runs), plus an opt-in env-wide "slowest tasks" scan. Pipeline metrics only.

import { hotkey } from "../lib/shortcut";
import { SwitchProjectAction } from "./project-picker";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { compareEnvironments } from "../lib/composer";
import { matches, parseSearch } from "../lib/filter";
import { formatDuration, hoursAgoIso, relativeTime } from "../lib/format";
import { Summary, pct, regression, runSeconds, summarize, taskStats } from "../lib/stats";
import { DurationDetail, barLabel, compactFlags } from "./chart-detail";
import {
  clientFor,
  envKey,
  errorText,
  queryable,
  refreshEnvironments,
  tierColor,
  tierLabel,
  useEnvironments,
} from "../lib/raycast";
import { ComposerEnvironment, DagRun } from "../lib/types";
import { DagPerformance } from "./dag-performance";
import { DagRuns } from "./dag-runs";
import { TaskHistory } from "./dag-tasks";
import { EnvironmentActions, FilterSubmenu, LoadErrorView, crumbs, refreshShortcut } from "./env-actions";
import { DagLineage } from "./lineage";

const WINDOWS = [6, 24, 72, 168];
const MAX_RUNS = 6000;
const MAX_TIS = 12000;

interface DagAgg {
  dagId: string;
  runs: DagRun[]; // chronological
  summary?: Summary;
  failed: number;
  finished: number;
  latest?: DagRun;
  reg?: { ratio: number; flagged: boolean };
}

type SortKey = "p90" | "p50" | "max" | "failed" | "runs" | "regression";

function aggregate(runs: DagRun[]): DagAgg[] {
  const by = new Map<string, DagRun[]>();
  runs.forEach((r) => by.set(r.dag_id, [...(by.get(r.dag_id) ?? []), r]));
  return [...by.entries()].map(([dagId, list]) => {
    const chron = list.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
    const secs = chron.map(runSeconds).filter((x): x is number => x !== undefined);
    const finished = chron.filter((r) => r.state === "success" || r.state === "failed");
    return {
      dagId,
      runs: chron,
      summary: summarize(secs),
      failed: finished.filter((r) => r.state === "failed").length,
      finished: finished.length,
      latest: chron[chron.length - 1],
      reg: regression(secs),
    };
  });
}

function sortAgg(a: DagAgg[], key: SortKey): DagAgg[] {
  const v = (x: DagAgg) =>
    key === "failed"
      ? x.failed
      : key === "runs"
        ? x.runs.length
        : key === "regression"
          ? (x.reg?.ratio ?? 0)
          : (x.summary?.[key] ?? -1);
  return [...a].sort((x, y) => v(y) - v(x));
}

function windowLabel(h: number) {
  return h >= 48 && h % 24 === 0 ? `${h / 24}d` : `${h}h`;
}

export function PerfOverview(props: { env?: ComposerEnvironment; root?: boolean }) {
  const { data: envData, isLoading: envLoading, error: envError, revalidate: revalidateEnvs } = useEnvironments();
  const envs = useMemo(() => queryable(envData?.environments).sort(compareEnvironments), [envData]);
  const [envSel, setEnvSel] = useState(props.env ? envKey(props.env) : "");
  const env = envs.find((e) => envKey(e) === envSel) ?? queryable(props.env ? [props.env] : [])[0] ?? envs[0];
  const [hours, setHours] = useState(24);
  const [sort, setSort] = useState<SortKey>("p90");
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (uri: string, h: number) => {
      const { runs, total } = await clientFor({ airflowUri: uri }).queryDagRuns(
        { start_date_gte: hoursAgoIso(h), order_by: "-start_date" },
        { max: MAX_RUNS },
      );
      return { runs, total };
    },
    [env?.airflowUri ?? "", hours],
    { keepPreviousData: true, execute: !!env },
  );
  const aggs = useMemo(() => aggregate(data?.runs ?? []), [data]);
  const parsed = parseSearch(searchText);
  const rows = sortAgg(aggs, sort).filter((a) =>
    matches(parsed, { dag: [a.dagId], is: [a.failed ? "failed" : "", a.reg?.flagged ? "slow" : ""] }, [a.dagId]),
  );
  const totalRuns = data?.runs.length ?? 0;
  const failedRuns = aggs.reduce((n, a) => n + a.failed, 0);
  const finishedRuns = aggs.reduce((n, a) => n + a.finished, 0);
  const capped = data && data.total > data.runs.length;

  const listActions = env && (
    <>
      <ActionPanel.Submenu title="Window…" icon={Icon.Calendar} shortcut={hotkey(["cmd"], "y")}>
        {WINDOWS.map((h) => (
          <Action key={h} title={`Last ${windowLabel(h)}`} onAction={() => setHours(h)} />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Sort by…" icon={Icon.ArrowUp} shortcut={hotkey(["cmd"], "s")}>
        <Action title="P90 Duration" onAction={() => setSort("p90")} />
        <Action title="Median Duration" onAction={() => setSort("p50")} />
        <Action title="Max Duration" onAction={() => setSort("max")} />
        <Action title="Failed Runs" onAction={() => setSort("failed")} />
        <Action title="Run Count" onAction={() => setSort("runs")} />
        <Action title="Regression (Latest ÷ Median)" onAction={() => setSort("regression")} />
      </ActionPanel.Submenu>
      <FilterSubmenu
        searchText={searchText}
        setSearchText={setSearchText}
        options={[
          { key: "is", value: "failed", title: "Has Failed Runs" },
          { key: "is", value: "slow", title: "Latest ≥ 2× Median" },
        ]}
      />
      <Action.Push
        title={`Slowest Tasks in ${env.id} (${windowLabel(hours)})`}
        icon={Icon.Stopwatch}
        shortcut={hotkey(["cmd", "shift"], "t")}
        target={<EnvTaskStats env={env} hours={hours} />}
      />
      <Action
        title={showDetail ? "Hide Chart Panel" : "Show Chart Panel"}
        icon={Icon.Sidebar}
        shortcut={hotkey(["cmd"], "d")}
        onAction={() => setShowDetail((v) => !v)}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
      <SwitchProjectAction />
      <EnvironmentActions env={env} />
    </>
  );

  return (
    <List
      isLoading={envLoading || isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : crumbs(env?.id, `perf ${windowLabel(hours)}`, `sorted by ${sort}`)}
      searchBarPlaceholder="Filter DAGs…  is:failed  is:slow  dag:dbt   (⌘Y window · ⌘S sort)"
      searchBarAccessory={
        <List.Dropdown tooltip="Environment" value={env ? envKey(env) : ""} onChange={setEnvSel}>
          {envs.map((e) => (
            <List.Dropdown.Item
              key={envKey(e)}
              title={`${e.id} (${tierLabel(e)})`}
              value={envKey(e)}
              icon={{ source: Icon.Cloud, tintColor: tierColor(e) }}
              keywords={[e.project]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!env && envError && (
        <LoadErrorView
          title="Could Not List Environments"
          error={envError}
          onRetry={() => refreshEnvironments(revalidateEnvs)}
        />
      )}
      {error && <List.EmptyView icon={Icon.Warning} title="Could not load runs" description={errorText(error)} />}
      <List.Section
        title={`${env?.id ?? ""} · last ${windowLabel(hours)}`}
        subtitle={`${rows.length} DAGs · ${totalRuns}${capped ? ` of ${data?.total} (capped)` : ""} runs · ${pct(
          finishedRuns - failedRuns,
          finishedRuns,
        )} run success`}
      >
        {env &&
          rows.map((a) => {
            const acc: List.Item.Accessory[] = [];
            if (a.reg?.flagged)
              acc.push({
                tag: { value: `${a.reg.ratio.toFixed(1)}× slower`, color: Color.Orange },
                tooltip: "Latest run vs median of earlier runs in window",
              });
            if (a.failed) acc.push({ tag: { value: `${a.failed}/${a.finished} ✗`, color: Color.Red } });
            if (!showDetail)
              acc.push({
                text: `${formatDuration(a.summary?.p50)} / ${formatDuration(a.summary?.p90)}`,
                icon: Icon.Stopwatch,
                tooltip: `p50 / p90 · max ${formatDuration(a.summary?.max)} · ${a.runs.length} runs in window`,
              });
            return (
              <List.Item
                key={a.dagId}
                icon={{ source: Icon.BarChart, tintColor: a.failed ? Color.Red : Color.Blue }}
                title={a.dagId}
                subtitle={showDetail ? undefined : a.latest ? relativeTime(a.latest.start_date) : undefined}
                accessories={
                  showDetail
                    ? compactFlags({ failed: a.failed, slowRatio: a.reg?.flagged ? a.reg.ratio : undefined })
                    : acc
                }
                detail={
                  <DurationDetail
                    heading={a.dagId}
                    subheading={`${a.runs.length} runs in last ${windowLabel(hours)} · oldest → newest`}
                    bars={a.runs.map((r) => ({
                      seconds: runSeconds(r),
                      state: r.state,
                      label: barLabel(r.start_date),
                    }))}
                    summary={a.summary}
                    facts={[
                      {
                        title: "Run Success",
                        tag: {
                          text: pct(a.finished - a.failed, a.finished),
                          color: a.failed ? Color.Red : Color.Green,
                        },
                      },
                      { title: "Failed / Finished", text: `${a.failed} / ${a.finished}` },
                      {
                        title: "Latest",
                        text: a.latest ? `${a.latest.state} · ${relativeTime(a.latest.start_date)}` : "-",
                      },
                      ...(a.reg
                        ? [
                            {
                              title: "Latest vs Median",
                              tag: {
                                text: `${a.reg.ratio.toFixed(1)}×`,
                                color: a.reg.flagged ? Color.Orange : Color.SecondaryText,
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
                        title="DAG Performance"
                        icon={Icon.BarChart}
                        target={<DagPerformance env={env} dagId={a.dagId} />}
                      />
                      <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={a.dagId} />} />
                      <Action.Push
                        title="Dataset Lineage"
                        icon={Icon.Network}
                        shortcut={hotkey(["cmd"], "l")}
                        target={<DagLineage env={env} dagId={a.dagId} />}
                      />
                    </ActionPanel.Section>
                    {listActions}
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}

/** Opt-in env-wide task stats for a window (can be ~6k+ task instances on busy environments). */
export function EnvTaskStats(props: { env: ComposerEnvironment; hours: number }) {
  const { env, hours } = props;
  const [progress, setProgress] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const { data, isLoading, error } = useCachedPromise(
    async (uri: string, h: number) => {
      const { tis, total } = await clientFor({ airflowUri: uri }).queryTaskInstances(
        { start_date_gte: hoursAgoIso(h) },
        { max: MAX_TIS, onProgress: (got, t) => setProgress(`${got}/${t} task instances`) },
      );
      setProgress(undefined);
      const byDag = new Map<string, typeof tis>();
      tis.forEach((t) => byDag.set(t.dag_id, [...(byDag.get(t.dag_id) ?? []), t]));
      const stats = [...byDag.entries()].flatMap(([dagId, list]) => taskStats(list).map((s) => ({ dagId, s })));
      return { stats, fetched: tis.length, total };
    },
    [env.airflowUri, hours],
    { keepPreviousData: true },
  );
  const parsed = parseSearch(searchText);
  const rows = (data?.stats ?? [])
    .filter(({ dagId, s }) =>
      matches(parsed, { dag: [dagId], task: [s.taskId], op: [s.operator], is: [s.failedRuns ? "failed" : ""] }, [
        dagId,
        s.taskId,
        s.operator,
      ]),
    )
    .sort((a, b) => (b.s.summary?.p90 ?? -1) - (a.s.summary?.p90 ?? -1))
    .slice(0, 300);
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={crumbs(env.id, `slowest tasks ${windowLabel(hours)}`, progress)}
      searchBarPlaceholder="Filter…  dag:x  task:run_dbt  op:CloudRun  is:failed"
    >
      {error && (
        <List.EmptyView icon={Icon.Warning} title="Could not load task instances" description={errorText(error)} />
      )}
      <List.Section
        title="Tasks by p90 duration"
        subtitle={
          data
            ? `${data.fetched}${
                data.total > data.fetched ? ` of ${data.total} (capped at ${MAX_TIS})` : ""
              } task instances · top ${rows.length}`
            : progress
        }
      >
        {rows.map(({ dagId, s }) => (
          <List.Item
            key={`${dagId}|${s.taskId}`}
            icon={{ source: Icon.Stopwatch, tintColor: s.failedRuns ? Color.Red : Color.Blue }}
            title={showDetail ? `${s.taskId} · ${dagId}` : s.taskId}
            subtitle={showDetail ? undefined : dagId}
            keywords={[dagId]}
            accessories={
              showDetail
                ? compactFlags({ failed: s.failedRuns, mapped: s.mapped })
                : [
                    ...(s.failedRuns ? [{ tag: { value: `${s.failedRuns} failed`, color: Color.Red } }] : []),
                    ...(s.mapped ? [{ tag: { value: "mapped", color: Color.Purple } }] : []),
                    {
                      text: `${formatDuration(s.summary?.p50)} / ${formatDuration(s.summary?.p90)}`,
                      icon: Icon.Stopwatch,
                      tooltip: `p50 / p90 · n=${s.summary?.n ?? 0}`,
                    },
                  ]
            }
            detail={
              <DurationDetail
                heading={s.taskId}
                subheading={`${dagId} · last ${windowLabel(hours)}`}
                bars={s.points.map((pt) => ({ seconds: pt.seconds, state: pt.state, label: barLabel(pt.start) }))}
                summary={s.summary}
                facts={[
                  { title: "DAG", text: dagId },
                  ...(s.operator ? [{ title: "Operator", text: s.operator }] : []),
                  {
                    title: "Failed Runs",
                    tag: { text: String(s.failedRuns), color: s.failedRuns ? Color.Red : Color.Green },
                  },
                  ...(s.mapped ? [{ title: "Mapped", text: "one point per run" }] : []),
                ]}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Task History"
                  icon={Icon.List}
                  target={<TaskHistory env={env} dagId={dagId} stats={s} />}
                />
                <Action
                  title={showDetail ? "Hide Chart Panel" : "Show Chart Panel"}
                  icon={Icon.Sidebar}
                  shortcut={hotkey(["cmd"], "d")}
                  onAction={() => setShowDetail((v) => !v)}
                />
                <Action.Push
                  title="DAG Performance"
                  icon={Icon.BarChart}
                  target={<DagPerformance env={env} dagId={dagId} />}
                />
                <Action.CopyToClipboard title="Copy Task ID" content={s.taskId} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
