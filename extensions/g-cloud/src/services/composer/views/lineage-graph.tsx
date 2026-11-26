// In-Raycast lineage graph: SVG of the DAG's dataset neighborhood rendered in a Detail view.
// Raycast markdown images are static, so navigation is via actions: re-center on any node
// (pushes the same view), change depth, toggle failure-handler edges, open the browser diagram.

import { hotkey } from "../lib/shortcut";
import { SaveQuicklinkAction } from "./quicklink";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { chartMarkdown, chartTheme } from "../lib/chart-image";
import { hoursAgoIso, relativeTime } from "../lib/format";
import { KIND_LABEL, SignalKind } from "../lib/lineage";
import { layoutLineage, lineageSvg } from "../lib/lineage-svg";
import { clientFor, errorText, FAILURE_WINDOW_HOURS, tierColor } from "../lib/raycast";
import { ComposerEnvironment } from "../lib/types";
import { DagPerformance } from "./dag-performance";
import { DagRuns } from "./dag-runs";
import { EnvironmentActions, crumbs, refreshShortcut } from "./env-actions";
import { DagLineage, graphOf, openLineageDiagram, useLineageGraph } from "./lineage";

const DATA_FLOW = new Set<SignalKind>(["success", "done", "complete", "data"]);
const DEPTHS: { value: number; title: string }[] = [
  { value: 1, title: "Depth 1" },
  { value: 2, title: "Depth 2" },
  { value: 3, title: "Depth 3" },
  { value: Infinity, title: "Full Depth" },
];

export function LineageGraphView(props: {
  env: ComposerEnvironment;
  dagId: string;
  depth?: number;
  showFailureHandlers?: boolean;
}) {
  const { env, dagId } = props;
  const [depth, setDepth] = useState(props.depth ?? 2);
  const [showHandlers, setShowHandlers] = useState(props.showFailureHandlers ?? false);
  // sidebar off by default: the graph gets the full window width
  const [showMeta, setShowMeta] = useState(false);
  const { data, isLoading, error, revalidate } = useLineageGraph(env);
  const { data: failed } = useCachedPromise(
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
  const g = useMemo(() => graphOf(data), [data]);
  const layout = useMemo(
    () => (g ? layoutLineage(g, dagId, { depth, kinds: showHandlers ? undefined : DATA_FLOW }) : undefined),
    [g, dagId, depth, showHandlers],
  );
  const failedSet = useMemo(() => new Set(failed ?? []), [failed]);

  let md: string;
  if (error) md = `# ${dagId}\n\n> ⚠️ ${errorText(error)}`;
  else if (!layout) md = `# ${dagId}\n\n_Loading dataset graph for ${env.id}…_`;
  else if (layout.nodes.length <= 1)
    md = `# ${dagId}\n\nThis DAG has no dataset lineage${
      showHandlers ? "" : " (failure-handler edges hidden — ⌘H to show)"
    }.`;
  else {
    const svg = lineageSvg(layout, { theme: chartTheme(), failed: failedSet, title: `${dagId} · ${env.id}` });
    // Detail without metadata spans the window; cap display width, keep aspect ratio.
    const width = Math.min(layout.width + 70, showMeta ? 520 : 860);
    const notes: string[] = [];
    if (layout.truncatedUp || layout.truncatedDown)
      notes.push(
        `_${
          layout.truncatedUp + layout.truncatedDown
        } DAG(s) not drawn (wide columns capped) — open the browser diagram (⌘D)._`,
      );
    if (layout.width > 1600) notes.push("_Wide graph scaled down — lower the depth (⌘1/⌘2) for larger text._");
    const upN = layout.nodes.filter((n) => n.role === "up").length;
    const downN = layout.nodes.filter((n) => n.role === "down").length;
    const failedN = layout.nodes.filter((n) => failedSet.has(n.id)).length;
    const summary = `**${upN}** upstream · **${downN}** downstream · ${layout.edges.length} edges${
      failedN ? ` · **${failedN} failed recently**` : ""
    } · ⌘E re-center · ⌘1–4 depth · ⌘H failure handlers · ⌘I details`;
    md = [chartMarkdown(svg, { alt: "lineage", width }), summary, ...notes].join("\n\n");
  }

  const ups = layout?.nodes.filter((n) => n.role === "up") ?? [];
  const downs = layout?.nodes.filter((n) => n.role === "down") ?? [];
  const kinds = Array.from(new Set(layout?.edges.map((e) => e.kind) ?? []));

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={crumbs(env.id, dagId, "graph", depth === Infinity ? "full" : `depth ${depth}`)}
      markdown={md}
      metadata={
        showMeta &&
        layout && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Environment">
              <Detail.Metadata.TagList.Item text={env.id} color={tierColor(env)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Upstream DAGs" text={String(ups.length)} icon={Icon.ArrowLeft} />
            <Detail.Metadata.Label title="Downstream DAGs" text={String(downs.length)} icon={Icon.ArrowRight} />
            <Detail.Metadata.Label title="Edges" text={String(layout.edges.length)} />
            <Detail.Metadata.TagList title="Signals">
              {kinds.map((k) => (
                <Detail.Metadata.TagList.Item key={k} text={KIND_LABEL[k]} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Failed Recently">
              {layout.nodes
                .filter((n) => failedSet.has(n.id))
                .slice(0, 6)
                .map((n) => (
                  <Detail.Metadata.TagList.Item key={n.id} text={n.id} color={Color.Red} />
                ))}
              {!layout.nodes.some((n) => failedSet.has(n.id)) ? (
                <Detail.Metadata.TagList.Item text="none" color={Color.Green} />
              ) : null}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Failure Handlers" text={showHandlers ? "shown" : "hidden (⌘H)"} />
            {data && <Detail.Metadata.Label title="Graph Fetched" text={relativeTime(data.fetchedAt)} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {layout && layout.nodes.length > 1 && (
            <ActionPanel.Submenu title="Re-Center on…" icon={Icon.Center} shortcut={hotkey(["cmd"], "e")}>
              {[...ups, ...downs].map((n) => (
                <Action.Push
                  key={n.id}
                  title={n.id}
                  icon={{
                    source: n.role === "up" ? Icon.ArrowLeft : Icon.ArrowRight,
                    tintColor: failedSet.has(n.id) ? Color.Red : undefined,
                  }}
                  target={<LineageGraphView env={env} dagId={n.id} depth={depth} showFailureHandlers={showHandlers} />}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Section title="Graph">
            {DEPTHS.map((d, i) => (
              <Action
                key={d.title}
                title={d.title}
                icon={depth === d.value ? Icon.CheckCircle : Icon.Circle}
                shortcut={hotkey(["cmd"], String(i + 1) as "1" | "2" | "3" | "4")}
                onAction={() => setDepth(d.value)}
              />
            ))}
            <Action
              title={showHandlers ? "Hide Failure-Handler Edges" : "Show Failure-Handler Edges"}
              icon={Icon.Eye}
              shortcut={hotkey(["cmd"], "h")}
              onAction={() => setShowHandlers((v) => !v)}
            />
            {g && (
              <Action
                title="Open Interactive Diagram in Browser"
                icon={Icon.Globe}
                shortcut={hotkey(["cmd"], "d")}
                onAction={() => openLineageDiagram(env, g, dagId, depth, failed)}
              />
            )}
            <Action
              title={showMeta ? "Hide Details Sidebar" : "Show Details Sidebar"}
              icon={Icon.Sidebar}
              shortcut={hotkey(["cmd"], "i")}
              onAction={() => setShowMeta((v) => !v)}
            />
            <Action title="Refresh Graph" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
            <SaveQuicklinkAction
              context={{
                project: env.project,
                env: env.name,
                dag: dagId,
                view: "graph",
                depth: Number.isFinite(depth) ? depth : "full",
              }}
              name={`Airflow lineage · ${dagId}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={dagId}>
            <Action.Push
              title="Lineage List"
              icon={Icon.List}
              shortcut={hotkey(["cmd"], "l")}
              target={<DagLineage env={env} dagId={dagId} />}
            />
            <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={dagId} />} />
            <Action.Push
              title="Performance"
              icon={Icon.BarChart}
              shortcut={hotkey(["cmd", "shift"], "p")}
              target={<DagPerformance env={env} dagId={dagId} />}
            />
            <Action.OpenInBrowser
              title="Open DAG in Airflow"
              url={clientFor(env).uiDagUrl(dagId)}
              shortcut={hotkey(["cmd"], "o")}
            />
          </ActionPanel.Section>
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}
