// Pure dataset lineage: DAG -> dataset -> DAG graph built from GET /datasets (per environment).
// Optional convention: dataset URIs shaped dag_<kind>__<dag_id> (kind = success|done|failed|complete)
// are treated as completion signals and tagged with that kind, so e.g. a consumer of dag_failed__X
// shows as a failure handler. Any other URI (gs://, bigquery://, ...) is a plain "data" edge.

import { Dataset } from "./types";

export type SignalKind = "success" | "done" | "failed" | "complete" | "data";

export function signalKind(uri: string): SignalKind {
  const m = uri.match(/^dag_(success|done|failed|complete)__/);
  return (m?.[1] as SignalKind) ?? "data";
}

export interface LineageEdge {
  from: string; // producer DAG
  to: string; // consumer DAG
  datasetUri: string;
  datasetId: number;
  kind: SignalKind;
  producerTask?: string;
}

export interface LineageGraph {
  dags: Set<string>;
  edges: LineageEdge[];
  out: Map<string, LineageEdge[]>;
  in: Map<string, LineageEdge[]>;
  /** datasets produced by a DAG (incl. those nobody consumes) */
  produces: Map<string, Dataset[]>;
  /** datasets a DAG consumes */
  consumes: Map<string, Dataset[]>;
  datasets: Dataset[];
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
}

export function buildGraph(datasets: Dataset[]): LineageGraph {
  const g: LineageGraph = {
    dags: new Set(),
    edges: [],
    out: new Map(),
    in: new Map(),
    produces: new Map(),
    consumes: new Map(),
    datasets,
  };
  const seen = new Set<string>();
  for (const d of datasets) {
    const kind = signalKind(d.uri);
    const producers = Array.from(new Set(d.producing_tasks.map((p) => p.dag_id)));
    for (const p of producers) {
      g.dags.add(p);
      push(g.produces, p, d);
    }
    for (const c of d.consuming_dags) {
      g.dags.add(c.dag_id);
      push(g.consumes, c.dag_id, d);
      for (const pt of d.producing_tasks) {
        const key = `${pt.dag_id}>${c.dag_id}>${d.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const e: LineageEdge = {
          from: pt.dag_id,
          to: c.dag_id,
          datasetUri: d.uri,
          datasetId: d.id,
          kind,
          producerTask: pt.task_id,
        };
        g.edges.push(e);
        push(g.out, e.from, e);
        push(g.in, e.to, e);
      }
    }
  }
  return g;
}

export interface Reached {
  dagId: string;
  depth: number;
  via: LineageEdge; // edge that first reached it (BFS)
}

/** BFS from a DAG. depth = Infinity for the full closure. Visited set prevents cycles. */
export function traverse(
  g: LineageGraph,
  root: string,
  direction: "up" | "down",
  maxDepth = Infinity,
  kinds?: Set<SignalKind>,
): Reached[] {
  const out: Reached[] = [];
  const visited = new Set([root]);
  let frontier = [root];
  for (let depth = 1; frontier.length && depth <= maxDepth; depth++) {
    const next: string[] = [];
    for (const node of frontier) {
      const edges = (direction === "down" ? g.out.get(node) : g.in.get(node)) ?? [];
      for (const e of edges) {
        if (kinds && !kinds.has(e.kind)) continue;
        const other = direction === "down" ? e.to : e.from;
        if (visited.has(other)) continue;
        visited.add(other);
        out.push({ dagId: other, depth, via: e });
        next.push(other);
      }
    }
    frontier = next;
  }
  return out;
}

/** Sub-graph (nodes + edges) within `depth` of root in both directions, for diagrams. */
export function neighborhood(g: LineageGraph, root: string, depth = Infinity, kinds?: Set<SignalKind>) {
  const nodes = new Set([root]);
  traverse(g, root, "up", depth, kinds).forEach((r) => nodes.add(r.dagId));
  traverse(g, root, "down", depth, kinds).forEach((r) => nodes.add(r.dagId));
  const edges = g.edges.filter((e) => nodes.has(e.from) && nodes.has(e.to) && (!kinds || kinds.has(e.kind)));
  return { nodes: [...nodes], edges };
}

/**
 * Render an Airflow dataset_expression ({"all": [...]}, {"any": [...]}, nested, or a bare URI
 * string) as indented text lines. `arrived` marks URIs already queued for the next run.
 */
export function expressionLines(expr: unknown, arrived: Set<string> = new Set(), indent = 0): string[] {
  const pad = "  ".repeat(indent);
  if (expr === null || expr === undefined) return [];
  if (typeof expr === "string") return [`${pad}${arrived.has(expr) ? "✓" : "○"} ${expr}`];
  if (Array.isArray(expr)) return expr.flatMap((x) => expressionLines(x, arrived, indent));
  if (typeof expr === "object") {
    const o = expr as Record<string, unknown>;
    for (const op of ["all", "any"]) {
      if (op in o) {
        const items = (o[op] as unknown[]) ?? [];
        return [`${pad}${op.toUpperCase()} of:`, ...items.flatMap((x) => expressionLines(x, arrived, indent + 1))];
      }
    }
    if (typeof o.uri === "string") return expressionLines(o.uri, arrived, indent);
    if (typeof o.alias === "string") return [`${pad}alias ${o.alias}`];
  }
  return [`${pad}${JSON.stringify(expr)}`];
}

/** URIs mentioned in an expression. */
export function expressionUris(expr: unknown): string[] {
  return expressionLines(expr)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("✓ ") || l.startsWith("○ "))
    .map((l) => l.slice(2));
}

export const KIND_LABEL: Record<SignalKind, string> = {
  success: "on success",
  done: "on done",
  failed: "on failure",
  complete: "on complete",
  data: "data",
};
