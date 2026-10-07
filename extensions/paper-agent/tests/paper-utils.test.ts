import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { isPaperRecord, parseCliPapers, parseSavedPapers, renderPaperDetailMarkdown } from "../src/paper-utils";

const options = { paperDir: "/papers", libraryDir: "/papers/library", fallbackDate: "2026-10-06" };

test("legacy null metadata remains readable with saved timestamps and all entries intact", () => {
  const base = { id: "legacy", title: "Legacy", date: "2026-01-01", notePath: "/papers/legacy.md", hasNote: true };
  const raw = JSON.stringify([
    {
      ...base,
      authors: null,
      categories: null,
      abstract: null,
      link: null,
      published: null,
      whyThisPaper: null,
      favoritedAt: "2026-01-02",
      queuedAt: "2026-01-03",
      researchSummary: { heading: null, body: null },
      relatedLocalPapers: [{ id: "related", title: "Related", date: null, notePath: null, link: null, reasons: null }],
    },
    { ...base, id: "current", abstract: "Current abstract" },
  ]);
  const papers = parseSavedPapers(raw);
  assert.equal(papers.length, 2);
  assert.equal((papers[0] as unknown as { favoritedAt: string }).favoritedAt, "2026-01-02");
  assert.equal((papers[0] as unknown as { queuedAt: string }).queuedAt, "2026-01-03");
  assert.match(renderPaperDetailMarkdown(papers[0], papers[0].date), /No abstract available/);
  assert.equal(papers[1].abstract, "Current abstract");
});

test("invalid required saved metadata is still rejected without silently dropping entries", () => {
  assert.throws(
    () => parseSavedPapers('[{"id":null,"title":"Saved","date":"2026-01-01","notePath":"/note.md"}]'),
    /not been overwritten/,
  );
});

test("corrupted saved related papers are rejected before rendering", () => {
  const [paper] = parseCliPapers('[{"id":"saved","title":"Saved"}]', options);
  assert.equal(isPaperRecord(paper), true);
  assert.equal(isPaperRecord({ ...paper, relatedLocalPapers: [{ id: "bad", title: {} }] }), false);
  assert.equal(isPaperRecord({ ...paper, researchSummary: { body: 42 } }), false);
});

test("malformed optional fields cannot crash list rendering", () => {
  const [paper] = parseCliPapers(
    JSON.stringify([
      null,
      [],
      {
        id: "valid",
        title: { invalid: true },
        authors: "not an array",
        categories: ["cs.AI", 5],
        note_path: 123,
        date: {},
        research_summary: { body: 42 },
        related_local_papers: [null, [], { title: 42, reasons: ["Relevant", null] }],
      },
    ]),
    options,
  );
  assert.equal(paper.title, "Untitled");
  assert.deepEqual(paper.authors, []);
  assert.deepEqual(paper.categories, ["cs.AI"]);
  assert.doesNotThrow(() => renderPaperDetailMarkdown(paper, paper.date));
});

test("absolute note paths remain absolute", () => {
  const [paper] = parseCliPapers('[{"id":"p","note_path":"/custom/note.md"}]', options);
  assert.equal(paper.notePath, "/custom/note.md");
});

test("an empty library is distinct from invalid JSON or an incompatible CLI response", () => {
  assert.deepEqual(parseCliPapers("[]", options), []);
  assert.throws(() => parseCliPapers("", options), /invalid JSON/);
  assert.throws(() => parseCliPapers("Traceback: core failed", options), /invalid JSON/);
  assert.throws(() => parseCliPapers('{"error":"failed"}', options), /unexpected response/);
});

test("existing core fields, summaries, and relative note links remain readable", (t) => {
  const paperDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-library-"));
  t.after(() => fs.rmSync(paperDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(paperDir, "note.md"), "# Paper");
  const [paper] = parseCliPapers(
    JSON.stringify([
      {
        id: "2601.12345",
        title: "Example paper",
        date: "2026-10-06",
        authors: ["A. Author"],
        note_path: "note.md",
        categories: ["cs.AI"],
        abstract: "Abstract text",
        why_this_paper: "Keyword match",
        research_summary: { heading: "Summary", body: "Existing research summary" },
        related_local_papers: [
          { id: "related", title: "Related paper", note_path: "note.md", reasons: ["Shared topic"] },
        ],
      },
    ]),
    { ...options, paperDir },
  );
  assert.equal(paper.notePath, path.join(paperDir, "note.md"));
  assert.equal(paper.hasNote, true);
  assert.equal(paper.relatedLocalPapers?.[0].hasNote, true);
  const markdown = renderPaperDetailMarkdown(paper, paper.date);
  for (const text of [
    "Example paper",
    "A. Author",
    "Keyword match",
    "Abstract text",
    "Existing research summary",
    "Related paper",
    "Shared topic",
  ]) {
    assert.ok(markdown.includes(text));
  }
});
