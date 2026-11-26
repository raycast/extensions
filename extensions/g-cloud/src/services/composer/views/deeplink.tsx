// Deeplink / quicklink entry: open any level of the hierarchy directly from a launchContext.
//
//   raycast://extensions/<owner>/<extension>/composer?launchContext=<url-encoded JSON>
//   { "env": "projects/p/locations/r/environments/e" }                 -> DAGs in env (a bare id works if unambiguous)
//   { "project": "my-project", "search": "is:failed" }                 -> DAGs in project, filtered
//   { "env": "...", "dag": "dwh_refresh" }                             -> runs of DAG
//   { "env": "...", "dag": "...", "state": "failed" }                  -> failed runs of DAG
//   { "env": "...", "dag": "...", "run": "<run id>" }                  -> task instances
//   { "env": "...", "dag": "...", "run": "...", "task": "x", "map": 0, "try": 1 } -> task log
//   { "view": "discover" } · { "view": "import-errors", "env"?: "..." } · { "view": "failures", "env"?: "..." }
//   { "view": "environments", "project"?: "..." } · { "view": "datasets" | "performance", "env"?: "..." }
//   { "env": "...", "view": "slowest-tasks", "hours": 24 } · { "env": "...", "view": "dataset", "dataset": "<uri>" }

import { Detail, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clientFor, errorText, unqueryableReason, useEnvironments, useProjectProp } from "../lib/raycast";
import { ComposerEnvironment } from "../lib/types";
import { DagList } from "./dag-list";
import { DagRuns } from "./dag-runs";
import { TaskInstances } from "./task-instances";
import { TaskLog } from "./task-log";
import { DagPerformance } from "./dag-performance";
import { DagTasks } from "./dag-tasks";
import { DagLineage } from "./lineage";
import { DatasetsList, RunLineage } from "./datasets";
import { EnvTaskStats, PerfOverview } from "./perf-overview";
import { DatasetDetail } from "./datasets";
import { ImportErrorsList } from "./import-errors-list";
import { DiscoverView } from "./discover";
import { HierarchyContext } from "./quicklink";
import { EnvironmentsList } from "./environments-list";
import { FailuresList } from "./failures-list";
import { useLineageGraph } from "./lineage";
import { LineageGraphView } from "./lineage-graph";

export type { HierarchyContext } from "./quicklink";

export function isHierarchyContext(c: unknown): c is HierarchyContext {
  return !!c && typeof c === "object" && ["project", "env", "dag", "search", "view"].some((k) => k in (c as object));
}

export function HierarchyLauncher(props: { context: HierarchyContext }) {
  const ctx = props.context;
  // A saved link opens in its own project, whatever the hub currently has selected.
  useProjectProp(ctx.project);
  const { data, isLoading, error } = useEnvironments();
  if (ctx.view === "discover") return <DiscoverView />;
  if (ctx.view === "import-errors" && !ctx.env) return <ImportErrorsList />;
  if (!ctx.env) {
    if (ctx.view === "environments") return <EnvironmentsList project={ctx.project} />;
    if (ctx.view === "failures") return <FailuresList project={ctx.project} />;
    if (ctx.view === "datasets") return <DatasetsList />;
    if (ctx.view === "performance") return <PerfOverview />;
    return <DagList project={ctx.project} initialSearch={ctx.search} />;
  }
  // Saved links carry the full resource name; a bare id is accepted only when it is unambiguous.
  const all = data?.environments ?? [];
  const byId = all.filter((e) => e.id === ctx.env);
  const env = all.find((e) => e.name === ctx.env) ?? (byId.length === 1 ? byId[0] : undefined);
  if (!env && byId.length > 1) {
    const regions = byId.map((e) => `\`${e.location}\``).join(", ");
    return (
      <Detail
        markdown={`# Ambiguous environment\n\n\`${ctx.env}\` exists in several regions (${regions}). Save the link again to store the full resource name.`}
      />
    );
  }
  if (!env) {
    if (isLoading) return <List isLoading navigationTitle={`Resolving ${ctx.env}…`} searchBarPlaceholder="Loading…" />;
    return (
      <Detail
        markdown={`# Environment not found\n\n\`${ctx.env}\` is not in the project \`${ctx.project ?? "(current)"}\`.${
          error ? `\n\n> ${errorText(error)}` : ""
        }`}
      />
    );
  }
  const unsupported = unqueryableReason(env);
  if (unsupported) return <Detail markdown={`# Environment cannot be browsed\n\n${unsupported}`} />;
  if (!ctx.dag) {
    if (ctx.view === "datasets") return <DatasetsList env={env} />;
    if (ctx.view === "failures") return <FailuresList env={env} />;
    if (ctx.view === "performance") return <PerfOverview env={env} />;
    if (ctx.view === "slowest-tasks") return <EnvTaskStats env={env} hours={ctx.hours ?? 24} />;
    if (ctx.view === "import-errors") return <ImportErrorsList env={env} />;
    if (ctx.view === "dataset" && ctx.dataset) return <DatasetLauncher env={env} uri={ctx.dataset} />;
    return <DagList env={env} initialSearch={ctx.search} />;
  }
  if (!ctx.run && ctx.view === "perf") return <DagPerformance env={env} dagId={ctx.dag} />;
  if (!ctx.run && ctx.view === "tasks") return <DagTasks env={env} dagId={ctx.dag} />;
  if (!ctx.run && ctx.view === "graph")
    return <LineageGraphView env={env} dagId={ctx.dag} depth={ctx.depth === "full" ? Infinity : ctx.depth} />;
  if (!ctx.run && ctx.view === "lineage") return <DagLineage env={env} dagId={ctx.dag} />;
  if (ctx.run && !ctx.task && ctx.view === "run-lineage")
    return <RunLineage env={env} dagId={ctx.dag} runId={ctx.run} />;
  if (!ctx.run) return <DagRuns env={env} dagId={ctx.dag} initialState={ctx.state} />;
  if (!ctx.task) return <TaskInstances env={env} dagId={ctx.dag} runId={ctx.run} initialFilter={ctx.filter} />;
  return <TaskLogLauncher env={env} ctx={ctx} />;
}

function DatasetLauncher(props: { env: ComposerEnvironment; uri: string }) {
  const { data, isLoading, error } = useLineageGraph(props.env);
  const ds = data?.datasets.find((d) => d.uri === props.uri);
  if (ds) return <DatasetDetail env={props.env} dataset={ds} />;
  if (isLoading) return <List isLoading navigationTitle={`Resolving ${props.uri}…`} searchBarPlaceholder="Loading…" />;
  return <Detail markdown={`# Dataset not found\n\n\`${props.uri}\`${error ? `\n\n> ${errorText(error)}` : ""}`} />;
}

function TaskLogLauncher(props: { env: ComposerEnvironment; ctx: HierarchyContext }) {
  const { env, ctx } = props;
  const { data, isLoading, error } = useCachedPromise(
    (uri: string, d: string, r: string) => clientFor({ airflowUri: uri }).listTaskInstances(d, r),
    [env.airflowUri, ctx.dag ?? "", ctx.run ?? ""],
  );
  // With an explicit map index only that instance matches; without one, prefer the unmapped instance.
  const ti =
    ctx.map !== undefined
      ? data?.find((t) => t.task_id === ctx.task && t.map_index === ctx.map)
      : (data?.find((t) => t.task_id === ctx.task && t.map_index === -1) ?? data?.find((t) => t.task_id === ctx.task));
  if (ti) return <TaskLog env={env} ti={ti} tryNumber={ctx.try} />;
  if (isLoading) return <Detail isLoading markdown={`Resolving ${ctx.task}…`} />;
  return (
    <Detail
      markdown={`# Task not found\n\n\`${ctx.task}\` in run \`${ctx.run}\`.${error ? `\n\n> ${errorText(error)}` : ""}`}
    />
  );
}
