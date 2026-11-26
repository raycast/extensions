/**
 * Renders a JSON value as a box-drawing tree, the shape people know from
 * `tree`: one node per line, ├─ and └─ branches, value previews on leaves.
 * Pure text so the CLI, the editor plugins and the site can all show it.
 *
 * Collections print their size, leaves print their value. Long strings are
 * cut at PREVIEW_CHARS with an ellipsis so one minified blob cannot make the
 * tree unreadable; the count is still exact.
 */

const PREVIEW_CHARS = 60;

const preview = (v: unknown): string => {
  if (typeof v === 'string') {
    const shown = v.length > PREVIEW_CHARS ? `${v.slice(0, PREVIEW_CHARS)}…` : v;
    return JSON.stringify(shown);
  }
  if (typeof v === 'bigint') return v.toString();
  return String(v);
};

const label = (v: unknown): string => {
  if (Array.isArray(v)) return `[] ${v.length} ${v.length === 1 ? 'item' : 'items'}`;
  if (v !== null && typeof v === 'object') {
    const n = Object.keys(v as object).length;
    return `{} ${n} ${n === 1 ? 'key' : 'keys'}`;
  }
  return preview(v);
};

function branch(lines: string[], value: unknown, prefix: string): void {
  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [`[${i}]`, v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  entries.forEach(([key, v], i) => {
    const last = i === entries.length - 1;
    const isBranch = v !== null && typeof v === 'object';
    lines.push(`${prefix}${last ? '└─' : '├─'} ${key}: ${label(v)}`);
    if (isBranch && (Array.isArray(v) ? v.length : Object.keys(v as object).length)) {
      branch(lines, v, prefix + (last ? '   ' : '│  '));
    }
  });
}

/** The tree for any JSON text. Throws the parser's own message on bad input. */
export function renderJsonTree(input: string): string {
  const value = JSON.parse(input) as unknown;
  const lines = [label(value)];
  if (value !== null && typeof value === 'object') branch(lines, value, '');
  return lines.join('\n');
}
