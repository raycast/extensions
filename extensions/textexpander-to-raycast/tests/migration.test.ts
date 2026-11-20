import assert from "node:assert/strict";
import { test } from "node:test";
import { convertLibrary } from "../src/lib/converter";
import { convertMacros } from "../src/lib/macros";
import {
  filterSnippets,
  keepConflict,
  migrationReport,
  parseSession,
  restoreSnippet,
  reviewSnippets,
  selectSnippets,
  serializeSession,
  updateSnippet,
} from "../src/lib/migration";
import { createSession } from "./helpers";

test("supported macros translate only when opted in and keep the original text", () => {
  const text = "%clipboard %| %Y-%m-%d %H:%M:%S";
  const library = {
    snippets: [{ id: "one", group: "Email", label: "Date", abbreviation: ";date", text, kind: "plain" as const }],
    suggestedCount: 0,
  };
  assert.equal(convertLibrary(library, false).snippets[0]?.snippet.text, text);
  const item = convertLibrary(library, false, true).snippets[0]!;
  assert.equal(item.original.text, text);
  assert.equal(item.snippet.text, '{clipboard} {cursor} {date format="yyyy-MM-dd HH:mm:ss"}');
  assert.ok(item.changes.length);
  assert.deepEqual(
    item.warnings.map((warning) => warning.code),
    ["placeholder"],
  );
});

test("ambiguous and unsupported macros leave the whole snippet intact", () => {
  for (const text of [
    "%clipboard %filltext:name=Name%",
    "%clipboard %%",
    "%| %|",
    "%| {cursor}",
    "%Yword",
    "%clipboard %snippet:other%",
  ]) {
    assert.deepEqual(convertMacros(text), { text, changes: [] });
  }
  assert.equal(convertMacros("%y/%m/%d").text, '{date format="yy/MM/dd"}');
  const session = createSession();
  const source = session.conversion.snippets[0]!;
  for (const kind of ["rich", "applescript", "shell", "unknown"] as const) {
    const result = convertLibrary(
      {
        snippets: [
          { id: source.id, group: source.group, label: "Script", abbreviation: ";s", text: "%clipboard", kind },
        ],
        suggestedCount: 0,
      },
      false,
      true,
    );
    assert.equal(result.snippets[0]?.snippet.text, "%clipboard");
  }
});

test("macro translation does not merge distinct source snippets that produce the same text", () => {
  const source = { id: "one", group: "Email", label: "Paste", abbreviation: ";paste", kind: "plain" as const };
  const result = convertLibrary(
    {
      snippets: [
        { ...source, text: "%clipboard" },
        { ...source, id: "two", text: "{clipboard}" },
      ],
      suggestedCount: 0,
    },
    false,
    true,
  );
  assert.equal(result.snippets.length, 2);
  assert.equal(result.duplicateCount, 0);
});

test("conflict resolution changes selection and leaves the comparison library intact", () => {
  const session = createSession();
  const [first, second] = session.conversion.snippets;
  assert.ok(first && second);
  const edited = updateSnippet(session, second.id, { ...second.snippet, keyword: ";hi" });
  edited.existing = [{ name: "Existing", text: "Do not change", keyword: ";hi" }];
  assert.ok(
    reviewSnippets(edited).every((item) => item.warnings.some((warning) => warning.code === "keyword-conflict")),
  );
  assert.ok(
    reviewSnippets(edited).every((item) => item.warnings.some((warning) => warning.code === "existing-conflict")),
  );
  const kept = keepConflict(edited, ";hi", first.id);
  assert.deepEqual(kept.selectedIds, [first.id]);
  assert.ok(!reviewSnippets(kept).some((item) => item.warnings.some((warning) => warning.code === "keyword-conflict")));
  assert.ok(reviewSnippets(kept)[0]?.warnings.some((warning) => warning.code === "existing-conflict"));
  assert.deepEqual(keepConflict(edited, ";hi").selectedIds, []);
  assert.deepEqual(kept.existing, edited.existing);
  const renamed = updateSnippet(kept, first.id, { ...first.snippet, keyword: ";unique" });
  assert.ok(!reviewSnippets(renamed)[0]?.warnings.some((warning) => warning.code === "existing-conflict"));
});

test("edits and repeated group renames preserve custom names and can be reset", () => {
  const session = createSession();
  const first = session.conversion.snippets[0]!;
  session.groupNames.Email = "Personal";
  assert.equal(reviewSnippets(session)[0]?.snippet.name, "[Personal] Greeting");
  const edited = updateSnippet(session, first.id, { name: "[Personal] Welcome", text: "Edited", keyword: ";welcome" });
  edited.groupNames.Email = "Home";
  assert.equal(reviewSnippets(edited)[0]?.snippet.name, "[Home] Welcome");
  assert.equal(reviewSnippets(restoreSnippet(edited, first.id))[0]?.snippet.text, "Hello!");
  const custom = updateSnippet(edited, first.id, { ...first.snippet, name: "Custom title" });
  custom.groupNames.Email = "Another";
  assert.equal(reviewSnippets(custom)[0]?.snippet.name, "Custom title");
  assert.equal(first.snippet.name, "[Email] Greeting");
});

test("filters keep selection across hidden groups and reports omit snippet bodies", () => {
  const session = createSession();
  const first = session.conversion.snippets[0]!;
  const filtered = filterSnippets(reviewSnippets(session), {
    group: "Email",
    filter: "all",
    search: "GREETING hello",
    selectedIds: session.selectedIds,
  });
  assert.deepEqual(
    filtered.map((item) => item.id),
    [first.id],
  );
  const next = selectSnippets(
    session,
    filtered.map((item) => item.id),
    false,
  );
  assert.deepEqual(next.selectedIds, [session.selectedIds[1]]);
  const report = migrationReport(next, true);
  assert.equal(report.summary.exported, 1);
  assert.equal(report.summary.excluded, 1);
  assert.ok(!JSON.stringify(report).includes("Hello!"));
  assert.ok(!JSON.stringify(report).includes("Best,"));
});

test("saved session validation rejects damaged data and invalid references", () => {
  const session = createSession();
  assert.deepEqual(parseSession(serializeSession(session)), session);
  assert.throws(() => parseSession("not JSON"), /damaged/);
  assert.throws(() => parseSession('{"version":2}'), /incompatible or damaged/);
  for (const changed of [
    { ...session, selectedIds: ["missing"] },
    { ...session, selectedIds: [session.selectedIds[0], session.selectedIds[0]] },
    { ...session, edits: { missing: { name: "Lost", text: "Lost" } } },
    {
      ...session,
      conversion: { ...session.conversion, snippets: [session.conversion.snippets[0], session.conversion.snippets[0]] },
    },
  ]) {
    assert.throws(() => parseSession(JSON.stringify(changed)), /invalid snippet references/);
  }
});
