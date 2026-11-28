import test from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { expandPath, isWithin, quoteSpotlight, searchScopes, spotlightQuery } from "../src/lib/query";

test("Spotlight literals escape query syntax and wildcard characters", () => {
  assert.equal(quoteSpotlight('a" || kMDItemFSName == "*'), '"a\\" || kMDItemFSName == \\"\\*"');
  assert.equal(quoteSpotlight("a\\b?*'"), '"a\\\\b\\?\\*\'"');
  assert.throws(() => quoteSpotlight("tag\nother"));
  assert.equal(
    spotlightQuery({ tags: ["invoice-2026", "review"], match: "all" }),
    '(kMDItemUserTags == "invoice-2026"c && kMDItemUserTags == "review"c)',
  );
  assert.match(spotlightQuery({ tags: ["one", "two"], match: "any" }), / \|\| /);
});

test("month searches have both bounds and use PDF's type identifier", () => {
  const query = spotlightQuery({
    tags: ["receipts"],
    match: "all",
    kind: "pdf",
    modifiedAfter: "2026-03-01",
    modifiedBefore: "2026-04-01",
  });
  assert.ok(query.includes('kMDItemContentTypeTree == "com.adobe.pdf"'));
  assert.ok(query.includes('>= $time.iso("2026-03-01T00:00:00.000Z")'));
  assert.ok(query.includes('< $time.iso("2026-04-01T00:00:00.000Z")'));
  assert.throws(() => spotlightQuery({ tags: ["a"], match: "all", modifiedAfter: "yesterday" }));
  assert.throws(() =>
    spotlightQuery({ tags: ["a"], match: "all", modifiedAfter: "2026-04-01", modifiedBefore: "2026-03-01" }),
  );
  assert.throws(() => spotlightQuery({ tags: ["a"], match: "all", kind: 'pdf" || true' }));
});

test("scope parsing deduplicates overlapping folders without confusing common prefixes", () => {
  assert.equal(expandPath("~/Documents"), `${homedir()}/Documents`);
  assert.deepEqual(searchScopes("/Users/example", "/Users/example/Documents;/Volumes/Archive\n/Volumes/Archive"), [
    "/Users/example",
    "/Volumes/Archive",
  ]);
  assert.equal(isWithin("/Users/example-two/a", "/Users/example"), false);
  assert.throws(() => expandPath("relative/folder"));
  assert.throws(() => expandPath("/tmp/a\0b"));
});
