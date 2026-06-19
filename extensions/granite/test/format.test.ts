// Unit tests for the markdown/format helpers — the non-trivial pure logic:
// dynamic code fences (so OCR'd backticks can't break out), table-field
// rendering, and ask-response source de-duplication. No Raycast/React imports,
// so these run under `node --test` like the client tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { documentToMarkdown, askToMarkdown, sourcesFor } from "../src/lib/format.ts";

test("scalar extracted fields render as humanized bullet lines", () => {
  const md = documentToMarkdown({
    title: "W-2",
    filename: null,
    summary: null,
    extracted_fields: [{ field_name: "employer_name", value: "Acme" }],
    full_text: null,
  });
  assert.match(md, /- \*\*Employer Name:\*\* Acme/);
});

test("a table-valued field renders as a markdown table, not raw JSON", () => {
  const value = JSON.stringify([
    { test: "glucose", result: "95" },
    { test: "hdl", result: "50" },
  ]);
  const md = documentToMarkdown({
    title: "Lab",
    filename: null,
    summary: null,
    extracted_fields: [{ field_name: "results", value }],
    full_text: null,
  });
  assert.match(md, /\| Test \| Result \|/); // humanized header
  assert.match(md, /\| glucose \| 95 \|/);
  assert.doesNotMatch(md, /\[\{"test"/); // not the raw JSON blob
});

test("full_text wraps in a fence longer than any internal backtick run", () => {
  const md = documentToMarkdown({
    title: "Doc",
    filename: null,
    summary: null,
    extracted_fields: [],
    full_text: "before\n```\nfenced code\n```\nafter",
  });
  // The internal run is 3 backticks, so the wrapping fence must be ≥4.
  assert.ok(md.includes("````"), "expected a 4-backtick wrapping fence");
  assert.match(md, /fenced code/); // body preserved intact
});

test("sourcesFor dedups and labels citation-only docs", () => {
  const sources = sourcesFor({
    query: "q",
    status: "answered",
    answer: "a",
    citations: [
      { document_id: "d1", page_number: 1, cited_text: "x" },
      { document_id: "d2", page_number: 2, cited_text: "y" },
    ],
    documents: [
      { id: "d1", title: "Doc One", filename: null, doc_type: null, subtype: null, status: "understood", vault: null },
    ],
  });
  assert.deepEqual(sources, [
    { id: "d1", title: "Doc One" },
    { id: "d2", title: "Document" },
  ]);
});

test("askToMarkdown is the answer body only — no source list (sources live in the metadata panel)", () => {
  const noAnswer = askToMarkdown({
    query: "q",
    status: "no_answer",
    answer: null,
    citations: [],
    documents: [
      { id: "d1", title: "T1", filename: null, doc_type: null, subtype: null, status: "understood", vault: null },
    ],
  });
  assert.match(noAnswer, /No direct answer/);
  assert.doesNotMatch(noAnswer, /## Sources/); // sources are not in the body anymore
  assert.doesNotMatch(noAnswer, /\[T1\]/);

  const withTotals = askToMarkdown({
    query: "how much VAT",
    status: "answered",
    answer: "You paid VAT.",
    citations: [],
    documents: [],
    aggregation: {
      field: "tax",
      doc_type: null,
      range: {},
      currency: "USD",
      total_count: 2,
      totals: [{ currency: "USD", sum: "100.00", count: 2 }],
    },
  });
  assert.match(withTotals, /You paid VAT\./);
  assert.match(withTotals, /\*\*Totals\*\*/); // a label, not a giant heading
  assert.match(withTotals, /USD: 100\.00 \(2 documents\)/);
});
