// Pure log-rendering helpers used by the task log view (testable outside Raycast).

import { ComposerEnvironment, TaskInstance } from "./types";

export const MAX_CHARS = 60_000;
export const FULL_LINES = 3000;
export const ERROR_RE = /(ERROR|CRITICAL|Traceback|Exception|Error:|FAILED|failed with|Failure in)/;

/** Error lines with `ctx` lines of context, gaps marked with "…". Pure. */
export function errorsWithContext(text: string, ctx = 2, maxBlocks = 40): string {
  const lines = text.split("\n");
  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (ERROR_RE.test(l)) for (let j = Math.max(0, i - ctx); j <= Math.min(lines.length - 1, i + ctx); j++) keep.add(j);
  });
  const idx = [...keep].sort((a, b) => a - b);
  const out: string[] = [];
  let blocks = 0;
  idx.forEach((i, n) => {
    if (n > 0 && i !== idx[n - 1] + 1) {
      out.push("…");
      blocks++;
    }
    if (blocks < maxBlocks) out.push(lines[i]);
  });
  return out.join("\n");
}

/** Keep the last MAX_CHARS characters, cutting at a line boundary. Pure. */
export function capChars(text: string, max = MAX_CHARS): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false };
  const s = text.slice(-max);
  return { text: s.slice(s.indexOf("\n") + 1), cut: true };
}

export function cloudLoggingUrl(env: ComposerEnvironment, ti: TaskInstance, tryNumber: number): string {
  const q = [
    `resource.type="cloud_composer_environment"`,
    `resource.labels.environment_name="${env.id}"`,
    `labels.workflow="${ti.dag_id}"`,
    `labels."task-id"="${ti.task_id}"`,
    `labels."run-id"="${ti.dag_run_id}"`,
    `labels."try-number"="${tryNumber}"`,
    ...(ti.map_index >= 0 ? [`labels."map-index"="${ti.map_index}"`] : []),
  ].join("\n");
  return `https://console.cloud.google.com/logs/query;query=${encodeURIComponent(q)}?project=${env.project}`;
}
