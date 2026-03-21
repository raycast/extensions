/** Defaults when calling GET /graphs (Raycast-friendly). */
export const DEFAULT_SUBGRAPH_MAX_DEPTH = 3;
export const DEFAULT_SUBGRAPH_MAX_NODES = 64;

const MAX_PROP_CHARS = 500;
const MAX_SEP_SEGMENTS = 5;
/** Conservative cap; Raycast rejects overly long tool messages. */
export const MAX_GRAPH_OUTPUT_CHARS = 50_000;

const TRUNC_SUFFIX = " … [truncated]";

function truncateString(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const cut = Math.max(0, maxLen - TRUNC_SUFFIX.length);
  return s.slice(0, cut) + TRUNC_SUFFIX;
}

function truncateSepField(s: string, maxSegments: number, maxChars: number): string {
  if (!s.includes("<SEP>")) {
    return truncateString(s, maxChars);
  }
  const parts = s.split("<SEP>");
  if (parts.length <= maxSegments) {
    const joined = parts.join("<SEP>");
    return joined.length <= maxChars ? joined : truncateString(joined, maxChars);
  }
  const kept = parts.slice(0, maxSegments).join("<SEP>");
  const more = parts.length - maxSegments;
  const suffix = ` … (+${more} more <SEP> segments)`;
  const combined = kept + suffix;
  return combined.length <= maxChars ? combined : truncateString(combined, maxChars);
}

function sanitizeProperties(props: Record<string, unknown>, full: boolean): Record<string, unknown> {
  if (full) return { ...props };
  const out: Record<string, unknown> = { ...props };
  const heavyKeys = ["description", "file_path", "source_id"];
  for (const key of heavyKeys) {
    if (typeof out[key] === "string") {
      const v = out[key] as string;
      out[key] = v.includes("<SEP>")
        ? truncateSepField(v, MAX_SEP_SEGMENTS, MAX_PROP_CHARS)
        : truncateString(v, MAX_PROP_CHARS);
    }
  }
  for (const k of Object.keys(out)) {
    if (heavyKeys.includes(k)) continue;
    if (typeof out[k] === "string" && (out[k] as string).length > MAX_PROP_CHARS) {
      out[k] = truncateString(out[k] as string, MAX_PROP_CHARS);
    }
  }
  return out;
}

function sanitizeNode(node: unknown, full: boolean): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as Record<string, unknown>;
  const copy = { ...n };
  if (n.properties && typeof n.properties === "object" && !Array.isArray(n.properties)) {
    copy.properties = sanitizeProperties(n.properties as Record<string, unknown>, full);
  }
  return copy;
}

function sanitizeEdgeLike(edge: unknown, full: boolean): unknown {
  if (!edge || typeof edge !== "object") return edge;
  const e = edge as Record<string, unknown>;
  const copy = { ...e };
  if (e.properties && typeof e.properties === "object" && !Array.isArray(e.properties)) {
    copy.properties = sanitizeProperties(e.properties as Record<string, unknown>, full);
  }
  for (const k of Object.keys(copy)) {
    if (k === "properties") continue;
    if (typeof copy[k] === "string" && (copy[k] as string).length > MAX_PROP_CHARS) {
      copy[k] = truncateString(copy[k] as string, MAX_PROP_CHARS);
    }
  }
  return copy;
}

/**
 * Returns a deep-cloned structure safe to stringify for Raycast: long entity properties are shortened.
 */
export function sanitizeGraphResponse(data: unknown, fullProperties: boolean): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  const out = { ...d };
  if (Array.isArray(d.nodes)) {
    out.nodes = d.nodes.map((n) => sanitizeNode(n, fullProperties));
  }
  if (Array.isArray(d.edges)) {
    out.edges = d.edges.map((e) => sanitizeEdgeLike(e, fullProperties));
  }
  if (Array.isArray(d.relationships)) {
    out.relationships = d.relationships.map((e) => sanitizeEdgeLike(e, fullProperties));
  }
  return out;
}

/**
 * Pretty JSON first; then compact; then drop nodes/edges/relationships from the end until it fits.
 */
export function serializeGraphForRaycast(data: unknown, maxChars: number): string {
  const pretty = JSON.stringify(data, null, 2);
  if (pretty.length <= maxChars) return pretty;

  const compact = JSON.stringify(data);
  if (compact.length <= maxChars) {
    return `${compact}\n\n[Note: JSON compacted to fit Raycast message limits.]`;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return truncateString(pretty, maxChars);
  }

  const base = data as Record<string, unknown>;
  const origNodeCount = Array.isArray(base.nodes) ? base.nodes.length : 0;
  const origEdgeCount = Array.isArray(base.edges) ? base.edges.length : 0;
  const origRelCount = Array.isArray(base.relationships) ? base.relationships.length : 0;

  let nodes = Array.isArray(base.nodes) ? [...base.nodes] : [];
  let edges = Array.isArray(base.edges) ? [...base.edges] : [];
  let rels = Array.isArray(base.relationships) ? [...base.relationships] : [];

  const rest = { ...base };
  delete rest.nodes;
  delete rest.edges;
  delete rest.relationships;

  function buildPayload(): Record<string, unknown> {
    const o: Record<string, unknown> = { ...rest };
    if (nodes.length) o.nodes = nodes;
    if (edges.length) o.edges = edges;
    if (rels.length) o.relationships = rels;
    o._raycast_output_meta = {
      truncated: true,
      nodes_shown: nodes.length,
      edges_shown: edges.length,
      relationships_shown: rels.length,
      nodes_omitted: Math.max(0, origNodeCount - nodes.length),
      edges_omitted: Math.max(0, origEdgeCount - edges.length),
      relationships_omitted: Math.max(0, origRelCount - rels.length),
    };
    return o;
  }

  for (let i = 0; i < 50_000; i++) {
    const payload = buildPayload();
    const s = JSON.stringify(payload, null, 2);
    if (s.length <= maxChars) return s;
    const c = JSON.stringify(payload);
    if (c.length <= maxChars) {
      return `${c}\n\n[Note: JSON compacted to fit Raycast message limits.]`;
    }

    if (nodes.length > 0) {
      nodes = nodes.slice(0, -1);
      continue;
    }
    if (edges.length > 0) {
      edges = edges.slice(0, -1);
      continue;
    }
    if (rels.length > 0) {
      rels = rels.slice(0, -1);
      continue;
    }
    break;
  }

  return JSON.stringify(
    {
      _error: "Response still too large for Raycast after truncation.",
      _hint: "Use a smaller max_nodes, lower max_depth, or narrow the subgraph label.",
    },
    null,
    2,
  );
}
