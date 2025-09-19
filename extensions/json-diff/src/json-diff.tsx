// src/json-diff.tsx
import { Form, ActionPanel, Action, Detail, useNavigation, showToast, Toast } from "@raycast/api";

// ---------------- Types ----------------
export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

type Path = (string | number)[];
interface Change<T = JSONValue> {
  op: "add" | "remove" | "change";
  path: Path;
  a?: T;
  b?: T;
}

function isJSONObject(v: JSONValue): v is JSONObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isJSONArray(v: JSONValue): v is JSONArray {
  return Array.isArray(v);
}

export default function Command() {
  const { push } = useNavigation();

  function onSubmit(values: { a: string; b: string }) {
    try {
      const a = JSON.parse(values.a) as JSONValue;
      const b = JSON.parse(values.b) as JSONValue;
      const aN = normalize(a);
      const bN = normalize(b);

      const aStr = JSON.stringify(aN, null, 2);
      const bStr = JSON.stringify(bN, null, 2);

      const changes = diff(aN, bN);

      const md = [
        "## Unified Diff",
        "```diff",
        unified(aStr, bStr).join("\n"),
        "```",
        "",
        renderSummaryMarkdown(changes),
      ].join("\n");

      push(<Detail markdown={md} />);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      showToast({ style: Toast.Style.Failure, title: "Invalid JSON", message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compare" onSubmit={onSubmit as (values: { a: string; b: string }) => void} />
          <Action.CopyToClipboard title="Copy Example" content='{"a":1}\n{"a":2}' />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to use"
        text="Paste JSON A and JSON B (keys will be sorted). Output shows Unified Diff + Summary."
      />
      <Form.TextArea id="a" title="JSON A" placeholder='{"a":1}' enableMarkdown={false} />
      <Form.TextArea id="b" title="JSON B" placeholder='{"a":2}' enableMarkdown={false} />
    </Form>
  );
}

function normalize(v: JSONValue): JSONValue {
  if (isJSONArray(v)) return v.map(normalize);
  if (isJSONObject(v)) {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, normalize(v[k])]),
    );
  }
  return v;
}

function diff(a: JSONValue, b: JSONValue, path: Path = []): Change[] {
  // Different runtime kinds → change
  if (typeof a !== typeof b || isJSONArray(a) !== isJSONArray(b) || isJSONObject(a) !== isJSONObject(b)) {
    return [{ op: "change", path, a, b }];
  }

  if (isJSONArray(a) && isJSONArray(b)) {
    const out: Change[] = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i >= a.length) out.push({ op: "add", path: [...path, i], b: b[i] });
      else if (i >= b.length) out.push({ op: "remove", path: [...path, i], a: a[i] });
      else out.push(...diff(a[i], b[i], [...path, i]));
    }
    return out;
  }

  if (isJSONObject(a) && isJSONObject(b)) {
    const out: Change[] = [];
    const ak = new Set(Object.keys(a));
    const bk = new Set(Object.keys(b));
    for (const k of [...ak].filter((k) => !bk.has(k)).sort()) out.push({ op: "remove", path: [...path, k], a: a[k] });
    for (const k of [...bk].filter((k) => !ak.has(k)).sort()) out.push({ op: "add", path: [...path, k], b: b[k] });
    for (const k of [...ak].filter((k) => bk.has(k)).sort()) out.push(...diff(a[k], b[k], [...path, k]));
    return out;
  }

  // Primitive compare
  return a !== b ? [{ op: "change", path, a, b }] : [];
}

function fmtPath(path: Path) {
  return path.length ? path.map((p, i) => (typeof p === "number" ? `[${p}]` : (i ? "." : "") + p)).join("") : "<root>";
}

function renderSummaryMarkdown(changes: Change[]): string {
  const adds = changes.filter((c) => c.op === "add").length;
  const removes = changes.filter((c) => c.op === "remove").length;
  const changesN = changes.filter((c) => c.op === "change").length;

  const lines: string[] = [
    "## Summary",
    `- Added: **${adds}**`,
    `- Removed: **${removes}**`,
    `- Changed: **${changesN}**`,
    "",
    "## Details",
    ...changes.map((c) => {
      if (c.op === "add") return `+ \`${fmtPath(c.path)}\` = \`${json(c.b)}\``;
      if (c.op === "remove") return `- \`${fmtPath(c.path)}\` = \`${json(c.a)}\``;
      return `~ \`${fmtPath(c.path)}\` : \`${json(c.a)}\` → \`${json(c.b)}\``;
    }),
  ];
  return lines.join("\n");
}

function json(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ---------------- Inline highlighted unified diff ----------------
// Produces a list of lines using + / - / (space) with a diff fence for color in Raycast Detail.
function unified(a: string, b: string): string[] {
  const A = a.split("\n");
  const B = b.split("\n");
  const lcs: number[][] = Array(A.length + 1)
    .fill(0)
    .map(() => Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      lcs[i][j] = A[i] === B[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: string[] = ["--- A", "+++ B"]; // headers only for readability
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      out.push(" " + A[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push("-" + A[i]);
      i++;
    } else {
      out.push("+" + B[j]);
      j++;
    }
  }
  while (i < A.length) {
    out.push("-" + A[i]);
    i++;
  }
  while (j < B.length) {
    out.push("+" + B[j]);
    j++;
  }
  return out;
}
