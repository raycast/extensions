import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateTags,
  canonicalTags,
  matchesTags,
  normalizeTags,
  parseQuickTag,
  replaceFiles,
  tagCountLabel,
  TaggedFile,
} from "../src/lib/models";

const file = (path: string, names: string[]): TaggedFile => ({
  path,
  name: path,
  tags: names.map((name) => ({ name, color: 0 })),
  kind: "File",
  contentTypes: ["public.data"],
  size: 0,
  changed: false,
});

test("Quick Tag applies comma-separated tags and a leading minus to the whole batch", () => {
  assert.deepEqual(parseQuickTag(" invoice-2026, Review ,invoice-2026"), {
    kind: "add",
    tags: ["invoice-2026", "Review"],
  });
  assert.deepEqual(parseQuickTag("-draft,review"), { kind: "remove", tags: ["draft", "review"] });
  assert.throws(() => parseQuickTag("draft,-review"));
  assert.throws(() => parseQuickTag("draft,"));
  assert.throws(() => parseQuickTag("-"));
});

test("tag validation rejects metadata control characters and oversized UTF-8 names", () => {
  for (const name of ["", " ", "red\n6", "bad\0tag", "😀".repeat(64)]) assert.throws(() => normalizeTags([name]));
  assert.deepEqual(normalizeTags(["Résumé", "Re\u0301sume\u0301", "résumé"]), ["Résumé"]);
  assert.deepEqual(canonicalTags(["invoice"], [{ name: "Invoice", color: 4 }]), ["Invoice"]);
});

test("AND and OR use complete tag names, not substrings", () => {
  const item = file("/tmp/a", ["Invoice", "2026"]);
  assert.equal(matchesTags(item, ["invoice", "2026"], "all"), true);
  assert.equal(matchesTags(item, ["Invoice", "draft"], "all"), false);
  assert.equal(matchesTags(item, ["draft", "invoice"], "any"), true);
  assert.equal(matchesTags(item, ["Inv"], "any"), false);
  assert.equal(matchesTags(file("/tmp/b", []), [], "all"), false);
});

test("counts deduplicate case variants per file and prefer the Finder palette", () => {
  assert.deepEqual(
    aggregateTags(
      [file("a", ["invoice", "Invoice"]), file("b", ["Invoice", "draft"])],
      [{ name: "Invoice", color: 4 }],
    ),
    [
      { name: "Invoice", color: 4, count: 2 },
      { name: "draft", color: 0, count: 1 },
    ],
  );
});

test("saved tags remain visible without indexed files and unavailable counts are not shown as zero", () => {
  assert.deepEqual(aggregateTags([], [{ name: "Work", color: 4 }]), [{ name: "Work", color: 4, count: 0 }]);
  assert.equal(tagCountLabel(0, true), "Count unavailable");
  assert.equal(tagCountLabel(2, true), "2+ files");
  assert.equal(tagCountLabel(0, false), "0 files");
  assert.equal(tagCountLabel(1, false), "1 file");
});

test("local write results replace stale indexed tags immediately", () => {
  const updated = replaceFiles([file("a", ["draft"]), file("b", ["draft"])], [file("a", ["Invoice"])]);
  assert.equal(updated.length, 2);
  assert.deepEqual(
    updated.filter((item) => matchesTags(item, ["draft"], "all")).map((item) => item.path),
    ["b"],
  );
  assert.doesNotThrow(() => structuredClone(updated));
});
