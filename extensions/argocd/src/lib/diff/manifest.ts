/**
 * Renders a Kubernetes manifest to stable text so two of them can be diffed line by line.
 *
 * A diff of pretty-printed JSON with unsorted keys reports noise: two servers serialise the
 * same object with keys in different orders and every line moves. So keys are sorted, and the
 * output is YAML-shaped rather than JSON, because a YAML line carries its own key and reads on
 * its own, which is what makes a hunk of three lines understandable.
 *
 * The fields ArgoCD's own diff ignores are dropped for the same reason: `metadata.managedFields`
 * is large and always differs, and `status` is the cluster's own writing rather than anything
 * git asked for.
 */

const IGNORED_METADATA = new Set([
  "managedFields",
  "creationTimestamp",
  "generation",
  "resourceVersion",
  "uid",
  "selfLink",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Strips what a manifest diff should not report on, without touching anything else. */
export function stripNoise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNoise);
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "status") {
      continue;
    }
    if (key === "metadata" && isPlainObject(child)) {
      const metadata: Record<string, unknown> = {};
      for (const [metaKey, metaValue] of Object.entries(child)) {
        if (!IGNORED_METADATA.has(metaKey)) {
          metadata[metaKey] = stripNoise(metaValue);
        }
      }
      out.metadata = metadata;
      continue;
    }
    out[key] = stripNoise(child);
  }
  return out;
}

function quoteIfNeeded(text: string): string {
  // Anything that would change meaning as a bare YAML scalar gets quoted, so the rendering
  // stays unambiguous. This is not a YAML emitter; it is a stable, readable rendering.
  if (text.length === 0) {
    return '""';
  }
  if (/^[\w./@:+-]+$/.test(text) && !/^[-:]/.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

function renderScalar(value: unknown): string {
  if (typeof value === "string") {
    return value.includes("\n") ? JSON.stringify(value) : quoteIfNeeded(value);
  }
  if (value === null) {
    return "null";
  }
  return String(value);
}

function render(value: unknown, indent: number, out: string[]): void {
  const pad = "  ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out[out.length - 1] += " []";
      return;
    }
    for (const item of value) {
      if (isPlainObject(item) || Array.isArray(item)) {
        out.push(`${pad}-`);
        render(item, indent + 1, out);
      } else {
        out.push(`${pad}- ${renderScalar(item)}`);
      }
    }
    return;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) {
      out[out.length - 1] += " {}";
      return;
    }
    for (const key of keys) {
      const child = value[key];
      if (isPlainObject(child) || Array.isArray(child)) {
        out.push(`${pad}${key}:`);
        render(child, indent + 1, out);
      } else {
        out.push(`${pad}${key}: ${renderScalar(child)}`);
      }
    }
    return;
  }

  out.push(`${pad}${renderScalar(value)}`);
}

/**
 * Turns a manifest, given as the JSON string ArgoCD returns, into stable YAML-shaped text.
 * An empty or unparseable state renders as empty text, which diffs as a whole-object addition
 * or removal, and that is the right answer: a resource missing on one side is the difference.
 */
export function renderManifest(state: string | undefined): string {
  if (!state || state.trim().length === 0) {
    return "";
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(state);
  } catch {
    // Not JSON: diff it as it came rather than reporting nothing.
    return state.trimEnd();
  }
  const out: string[] = [];
  render(stripNoise(parsed), 0, out);
  return out.join("\n");
}
