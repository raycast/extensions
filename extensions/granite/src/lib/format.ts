// Pure presentation helpers: turn API payloads into the markdown the Detail
// views render, plus the canonical web deep-link. No Raycast imports so these
// stay trivially testable / reusable.

import type { AskResponse, DocumentDetail, DocumentListItem } from "./types";

const APP_BASE = "https://app.granite.co";

export function documentUrl(id: string): string {
  return `${APP_BASE}/documents/${id}`;
}

export function docTitle(doc: { title: string | null; filename: string | null }): string {
  return doc.title?.trim() || doc.filename?.trim() || "Untitled document";
}

// Human label for a doc_type/subtype pair, e.g. "tax / w-2".
export function typeLabel(doc: { doc_type: string | null; subtype: string | null }): string | null {
  const parts = [doc.doc_type, doc.subtype].filter((p): p is string => !!p);
  return parts.length ? parts.join(" / ") : null;
}

export function documentToMarkdown(doc: DocumentDetail): string {
  const lines: string[] = [`# ${docTitle(doc)}`];

  if (doc.summary?.trim()) {
    lines.push("", doc.summary.trim());
  }

  const fields = doc.extracted_fields.filter((f) => f.value != null && String(f.value).trim() !== "");
  if (fields.length) {
    lines.push("", "## Fields", "");
    for (const f of fields) {
      const rows = tableRows(f.value);
      if (rows) {
        // A `type: table` field arrives as a JSON-serialized row array — render it
        // as a real markdown table instead of dumping raw JSON.
        lines.push(`**${humanize(f.field_name)}**`, "", ...renderTable(rows), "");
      } else {
        lines.push(`- **${humanize(f.field_name)}:** ${f.value}`);
      }
    }
  }

  if (doc.full_text != null) {
    lines.push("", "## Full text", "", ...fencedBlock(doc.full_text.trim() || "(empty)"));
  }

  return lines.join("\n");
}

// The answer body only — the question and source links are rendered by the
// caller (the question as a lead quote, sources as clickable links in the
// Detail metadata panel, the native Raycast home for references).
export function askToMarkdown(res: AskResponse): string {
  const lines: string[] = [];

  if (res.answer?.trim()) {
    lines.push(res.answer.trim());
  } else {
    lines.push("_No direct answer found in your vault. The closest documents are listed alongside._");
  }

  if (res.aggregation && res.aggregation.totals.length) {
    lines.push("", "**Totals**");
    for (const t of res.aggregation.totals) {
      lines.push(`- ${t.currency ?? "—"}: ${t.sum} (${t.count} document${t.count === 1 ? "" : "s"})`);
    }
  }

  return lines.join("\n");
}

// Deduped source docs for an ask response: the returned `documents` list is the
// authoritative set; citations only carry ids, so we map them back to titles.
export function sourcesFor(res: AskResponse): Array<{ id: string; title: string }> {
  const byId = new Map<string, string>();
  for (const d of res.documents) {
    byId.set(d.id, docTitle(d));
  }
  for (const c of res.citations) {
    if (!byId.has(c.document_id)) byId.set(c.document_id, "Document");
  }
  return [...byId.entries()].map(([id, title]) => ({ id, title }));
}

// Subtitle accessory text for a list item: type, then date or tax year.
export function listSubtitle(doc: DocumentListItem): string | undefined {
  const t = typeLabel(doc);
  const date = doc.primary_date?.slice(0, 10) ?? (doc.tax_year ? `Tax ${doc.tax_year}` : undefined);
  return [t, date].filter(Boolean).join(" · ") || undefined;
}

function humanize(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Wrap text in a code fence long enough that any backtick run inside it (common
// in OCR'd code/transcripts) can't close the block early — the CommonMark rule
// is that a closing fence must be at least as long as the opening one.
function fencedBlock(body: string): string[] {
  const longest = (body.match(/`+/g) ?? []).reduce((n, run) => Math.max(n, run.length), 0);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return [fence, body, fence];
}

// A `type: table` extracted field is stored as a JSON-serialized array of flat
// row objects. Return those rows, or null for anything that isn't one (scalar
// fields, unparseable values) so the caller falls back to a plain line.
function tableRows(value: string | null): Array<Record<string, unknown>> | null {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  if (!parsed.every((row) => row !== null && typeof row === "object" && !Array.isArray(row))) return null;
  return parsed as Array<Record<string, unknown>>;
}

function renderTable(rows: Array<Record<string, unknown>>): string[] {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (columns.length === 0) return [];
  const cell = (v: unknown) =>
    String(v ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  const header = `| ${columns.map(humanize).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => cell(row[c])).join(" | ")} |`);
  return [header, divider, ...body];
}
