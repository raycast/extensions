import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { parseCliPapers, renderPaperDetailMarkdown } from "../src/paper-utils";

const options = { paperDir: "/papers", libraryDir: "/papers/library", fallbackDate: "2026-10-06" };

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
