// Dataset lineage inside Raycast: waits-on expression, upstream/downstream BFS with depth, Enter
// re-roots at that DAG. "Open Diagram" renders the neighborhood (or whole env) in the browser.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { useState } from "react";
import { DiagramNode, lineageHtml } from "../lib/diagram";
import { hoursAgoIso, relativeTime } from "../lib/format";
import {
  KIND_LABEL,
  LineageGraph,
  Reached,
  SignalKind,
  buildGraph,
  expressionLines,
  expressionUris,
  neighborhood,
  signalKind,
  traverse,
} from "../lib/lineage";
import { clientFor, errorText, FAILURE_WINDOW_HOURS } from "../lib/raycast";
import { ComposerEnvironment } from "../lib/types";
import { DagPerformance } from "./dag-performance";
import { DagRuns } from "./dag-runs";
import { EnvironmentActions, crumbs, refreshShortcut } from "./env-actions";
import { LineageGraphView } from "./lineage-graph";

const KIND_COLOR: Record<SignalKind, Color> = {
  success: Color.Green,
  done: Color.Blue,
  failed: Color.Red,
  complete: Color.Yellow,
  data: Color.Purple,
};
const DATA_FLOW = new Set<SignalKind>(["success", "done", "complete", "data"]);

/** Cached dataset graph for one environment (~5 s per env: 100 datasets per page). */
export function useLineageGraph(env: ComposerEnvironment) {
  return useCachedPromise(
    async (uri: string) => {
      const datasets = await clientFor({ airflowUri: uri }).listDatasets();
      return { datasets, fetchedAt: new Date().toISOString() };
    },
    [env.airflowUri],
    { keepPreviousData: true },
  );
}

export function graphOf(data?: { datasets: import("../lib/types").Dataset[] }): LineageGraph | undefined {
  return data ? buildGraph(data.datasets) : undefined;
}

/** Recently failed DAG ids (one capped query), used to color lineage nodes. */
function useRecentFailures(env: ComposerEnvironment) {
  return useCachedPromise(
    async (uri: string, h: number) => {
      const { runs } = await clientFor({ airflowUri: uri }).queryDagRuns(
        { states: ["failed"], start_date_gte: hoursAgoIso(h) },
        { max: 500 },
      );
      return Array.from(new Set(runs.map((r) => r.dag_id)));
    },
    [env.airflowUri, FAILURE_WINDOW_HOURS],
    { keepPreviousData: true },
  );
}

export async function openLineageDiagram(
  env: ComposerEnvironment,
  g: LineageGraph,
  root: string,
  depth: number,
  failed: string[] = [],
  whole = false,
) {
  try {
    const sub = whole ? { nodes: [...g.dags], edges: g.edges } : neighborhood(g, root, depth);
    const up = new Set(traverse(g, root, "up", depth).map((r) => r.dagId));
    const down = new Set(traverse(g, root, "down", depth).map((r) => r.dagId));
    const failedSet = new Set(failed);
    const nodes: DiagramNode[] = sub.nodes.map((id) => ({
      id,
      role: id === root ? "root" : up.has(id) ? "up" : down.has(id) ? "down" : "other",
      failed: failedSet.has(id),
      url: clientFor(env).uiDagUrl(id),
    }));
    if (!sub.edges.length) {
      await showToast(Toast.Style.Failure, "No dataset edges for this DAG", "Nothing to draw");
      return;
    }
    const html = lineageHtml({ envId: env.id, root, nodes, edges: sub.edges, generatedAt: new Date().toISOString() });
    const file = join(tmpdir(), `airflow-lineage-${env.id}-${root.replace(/[^\w.-]/g, "_")}.html`);
    writeFileSync(file, html);
    await open(file);
    await showToast(
      Toast.Style.Success,
      "Lineage opened in browser",
      `${nodes.length} DAGs · ${sub.edges.length} edges`,
    );
  } catch (e) {
    await showFailureToast(e, { title: "Could not open diagram" });
  }
}

const DEPTHS = [
  { value: "both:1", title: "Both Directions · Depth 1" },
  { value: "both:2", title: "Both Directions · Depth 2" },
  { value: "both:all", title: "Both Directions · Full" },
  { value: "up:all", title: "Upstream Only · Full" },
  { value: "down:all", title: "Downstream Only · Full" },
];

export function DagLineage(props: { env: ComposerEnvironment; dagId: string; root?: boolean }) {
  const { env, dagId } = props;
  const [mode, setMode] = useState("both:all");
  const [hideFailureHandlers, setHideFailureHandlers] = useState(true);
  const { data, isLoading, error, revalidate } = useLineageGraph(env);
  const { data: failed } = useRecentFailures(env);
  const { data: waits } = useCachedPromise(
    async (uri: string, id: string) => {
      const c = clientFor({ airflowUri: uri });
      const [details, queued] = await Promise.all([c.getDagDetails(id), c.queuedEvents(id).catch(() => [])]);
      return { expr: details.dataset_expression, queued: queued.map((q) => q.uri), paused: details.is_paused };
    },
    [env.airflowUri, dagId],
  );
  const g = graphOf(data);
  const [dir, depthStr] = mode.split(":");
  const depth = depthStr === "all" ? Infinity : Number(depthStr);
  const kinds = hideFailureHandlers ? DATA_FLOW : undefined;
  const up = g && dir !== "down" ? traverse(g, dagId, "up", depth, kinds) : [];
  const down = g && dir !== "up" ? traverse(g, dagId, "down", depth, kinds) : [];
  const failedSet = new Set(failed ?? []);
  const produced = g?.produces.get(dagId) ?? [];
  const arrived = new Set(waits?.queued ?? []);
  const exprLines = waits?.expr ? expressionLines(waits.expr, arrived) : [];
  const producerOf = (uri: string) => g?.datasets.find((d) => d.uri === uri)?.producing_tasks[0]?.dag_id;
  const hiddenFailureEdges =
    g && hideFailureHandlers
      ? (g.out.get(dagId) ?? []).filter((e) => e.kind === "failed" && (g.in.get(e.to)?.length ?? 0) > 0).length
      : 0;

  const reachedItem = (r: Reached, direction: "up" | "down") => {
    const acc: List.Item.Accessory[] = [
      { tag: { value: KIND_LABEL[r.via.kind], color: KIND_COLOR[r.via.kind] }, tooltip: r.via.datasetUri },
      { tag: { value: `${direction === "up" ? "↑" : "↓"}${r.depth}`, color: Color.SecondaryText } },
    ];
    if (failedSet.has(r.dagId)) acc.unshift({ tag: { value: "failed recently", color: Color.Red } });
    return (
      <List.Item
        key={`${direction}:${r.dagId}`}
        icon={{
          source: direction === "up" ? Icon.ArrowUp : Icon.ArrowDown,
          tintColor: failedSet.has(r.dagId) ? Color.Red : direction === "up" ? Color.Blue : Color.Green,
        }}
        title={r.dagId}
        subtitle={r.depth > 1 ? `via ${direction === "up" ? r.via.to : r.via.from}` : undefined}
        keywords={[r.via.datasetUri, r.via.kind]}
        accessories={acc}
        actions={
          <ActionPanel>
            <Action.Push
              title={`Lineage of ${r.dagId}`}
              icon={Icon.Network}
              target={<DagLineage env={env} dagId={r.dagId} />}
            />
            <Action.Push
              title={`Graph of ${r.dagId}`}
              icon={Icon.Switch}
              shortcut={hotkey(["cmd"], "g")}
              target={<LineageGraphView env={env} dagId={r.dagId} />}
            />
            <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={r.dagId} />} />
            <Action.Push
              title="Performance"
              icon={Icon.BarChart}
              shortcut={hotkey(["cmd", "shift"], "p")}
              target={<DagPerformance env={env} dagId={r.dagId} />}
            />
            {commonActions}
          </ActionPanel>
        }
      />
    );
  };

  const commonActions = (
    <>
      {g && (
        <Action
          title="Open Diagram (This Neighborhood)"
          icon={Icon.Network}
          shortcut={hotkey(["cmd"], "d")}
          onAction={() => openLineageDiagram(env, g, dagId, depth, failed)}
        />
      )}
      {g && (
        <Action
          title="Open Diagram (Whole Environment)"
          icon={Icon.Globe}
          shortcut={hotkey(["cmd", "shift"], "d")}
          onAction={() => openLineageDiagram(env, g, dagId, Infinity, failed, true)}
        />
      )}
      <Action
        title={hideFailureHandlers ? "Show Failure-Handler Edges" : "Hide Failure-Handler Edges"}
        icon={Icon.Eye}
        shortcut={hotkey(["cmd"], "h")}
        onAction={() => setHideFailureHandlers((v) => !v)}
      />
      <Action title="Refresh Graph" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
      <Action.OpenInBrowser title="Open Datasets in Airflow" url={`${env.airflowUri}/datasets`} />
      <EnvironmentActions env={env} />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={props.root ? undefined : crumbs(env.id, dagId, "lineage")}
      searchBarPlaceholder="Filter lineage by DAG or dataset…"
      searchBarAccessory={
        <List.Dropdown tooltip="Direction & Depth" value={mode} onChange={setMode}>
          {DEPTHS.map((d) => (
            <List.Dropdown.Item key={d.value} title={d.title} value={d.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && <List.EmptyView icon={Icon.Warning} title="Could not load datasets" description={errorText(error)} />}
      <List.Section title="DAG">
        <List.Item
          icon={{ source: Icon.Dot, tintColor: Color.Orange }}
          title={dagId}
          subtitle={
            g
              ? `${up.length} upstream · ${down.length} downstream · produces ${produced.length} dataset(s)`
              : "loading graph…"
          }
          accessories={[
            ...(failedSet.has(dagId) ? [{ tag: { value: "failed recently", color: Color.Red } }] : []),
            ...(waits?.paused ? [{ tag: { value: "paused", color: Color.SecondaryText } }] : []),
            ...(data ? [{ text: `graph ${relativeTime(data.fetchedAt)}` }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Graph"
                icon={Icon.Switch}
                shortcut={hotkey(["cmd"], "g")}
                target={<LineageGraphView env={env} dagId={dagId} />}
              />
              {commonActions}
              <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={dagId} />} />
              <Action.Push
                title="Performance"
                icon={Icon.BarChart}
                shortcut={hotkey(["cmd", "shift"], "p")}
                target={<DagPerformance env={env} dagId={dagId} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {exprLines.length > 0 && (
        <List.Section
          title="Waits On"
          subtitle={`${expressionUris(waits?.expr).filter((u) => arrived.has(u)).length}/${
            expressionUris(waits?.expr).length
          } signals queued for next run`}
        >
          {exprLines.map((line, i) => {
            const t = line.trim();
            const isUri = t.startsWith("✓ ") || t.startsWith("○ ");
            const uri = isUri ? t.slice(2) : undefined;
            const producer = uri ? producerOf(uri) : undefined;
            return (
              <List.Item
                key={`w${i}`}
                icon={
                  isUri
                    ? {
                        source: t.startsWith("✓") ? Icon.CheckCircle : Icon.Circle,
                        tintColor: t.startsWith("✓") ? Color.Green : Color.SecondaryText,
                      }
                    : Icon.Filter
                }
                title={line.replace(/^(\s*)[✓○] /, "$1")}
                subtitle={producer ? `from ${producer}` : undefined}
                accessories={
                  uri ? [{ tag: { value: KIND_LABEL[signalKind(uri)], color: KIND_COLOR[signalKind(uri)] } }] : []
                }
                actions={
                  <ActionPanel>
                    {producer && (
                      <Action.Push
                        title={`Lineage of ${producer}`}
                        icon={Icon.Network}
                        target={<DagLineage env={env} dagId={producer} />}
                      />
                    )}
                    {producer && (
                      <Action.Push
                        title={`Runs of ${producer}`}
                        icon={Icon.List}
                        target={<DagRuns env={env} dagId={producer} />}
                      />
                    )}
                    {uri && <Action.CopyToClipboard title="Copy Dataset URI" content={uri} />}
                    {commonActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title="Upstream" subtitle={`${up.length}`}>
        {up.map((r) => reachedItem(r, "up"))}
      </List.Section>
      <List.Section
        title="Downstream"
        subtitle={`${down.length}${
          hiddenFailureEdges ? ` · ${hiddenFailureEdges} failure handler(s) hidden (⌘H)` : ""
        }`}
      >
        {down.map((r) => reachedItem(r, "down"))}
      </List.Section>
      {g && !up.length && !down.length && !exprLines.length && (
        <List.Section title="No Dataset Lineage">
          <List.Item
            icon={Icon.Info}
            title="This DAG neither consumes nor feeds another DAG via datasets"
            subtitle={produced.length ? `It produces ${produced.length} dataset(s) nobody consumes` : undefined}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        </List.Section>
      )}
    </List>
  );
}
