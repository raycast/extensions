const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { criteria } = loadModule("src/data.ts");
const {
  REVIEW_SCOPE_STORAGE_KEY,
  isReviewScope,
  reviewScopeLabel,
  scopeIncludesLevel,
  criteriaForScope,
  reviewLevelCounts,
  reviewScopeMarkdown,
  reviewChecklistMarkdown,
} = loadModule("src/review-scope.ts");
const pkg = require("../package.json");

test("A + AA is default in Raycast preferences; options remain cumulative", () => {
  const setting = pkg.preferences.find((item) => item.name === "defaultLevel");
  assert.ok(setting);
  assert.equal(setting.required, true);
  assert.equal(setting.default, undefined);  assert.deepEqual(setting.data.map((item) => item.value), ["AA", "A", "AAA"]);
  assert.equal(pkg.preferences.find((item) => item.name === "includeAAA"), undefined);
  assert.deepEqual(["A", "AA", "AAA"].map(reviewScopeLabel), ["Level A Only", "A + AA", "A + AA + AAA"]);
  assert.equal(scopeIncludesLevel("A", "AA"), false);
  assert.equal(scopeIncludesLevel("AA", "A"), true);
  assert.equal(scopeIncludesLevel("AA", "AAA"), false);
  assert.equal(scopeIncludesLevel("AAA", "AAA"), true);
});

test("both WCAG versions have correct level counts and filter all applicable criteria", () => {
  const expected = {
    "2.1": { A: 30, AA: 20, AAA: 28 },
    "2.2": { A: 31, AA: 24, AAA: 31 },
  };
  for (const version of Object.keys(expected)) {
    const counts = reviewLevelCounts(criteria, version);
    assert.deepEqual(counts, expected[version]);
    assert.equal(criteriaForScope(criteria, version, "A").length, counts.A);
    assert.equal(criteriaForScope(criteria, version, "AA").length, counts.A + counts.AA);
    assert.equal(criteriaForScope(criteria, version, "AAA").length, counts.A + counts.AA + counts.AAA);
    assert.ok(criteriaForScope(criteria, version, "AA").every((criterion) => criterion.level !== "AAA"));
    if (version === "2.2") {
      assert.equal(criteriaForScope(criteria, version, "AA").some((criterion) => criterion.number === "4.1.1"), false);
    }
  }
});

test("scope guide stays precise about conformance and optional AAA", () => {
  const guide = reviewScopeMarkdown(criteria, "2.2", "AA", false);
  assert.match(guide, /31 \+ 24 = 55/);
  assert.match(guide, /AAA.*not generally required/s);
  assert.match(guide, /A filter is not a conformance claim/);
  assert.match(guide, /European Accessibility Act/);
  assert.match(guide, /26 April 2027 or 2028/);
  assert.match(guide, /Regulatory information last checked: 7 November 2026/);
  assert.match(guide, /Default from extension settings/);
  assert.match(reviewScopeMarkdown(criteria, "2.1", "AAA", true), /Saved from the Actions menu/);
});

test("each checklist contains only the selected version and level with initially untested entries", () => {
  for (const version of ["2.1", "2.2"]) {
    for (const level of ["A", "AA", "AAA"]) {
      const list = criteriaForScope(criteria, version, level);
      const checklist = reviewChecklistMarkdown(criteria, version, level);
      assert.equal((checklist.match(/^- \[ \]/gm) || []).length, list.length);
      assert.equal((checklist.match(/\[Result: Not tested\]/g) || []).length, list.length);
      for (const criterion of list) assert.ok(checklist.includes(`${criterion.number} ${criterion.title}`));
      assert.doesNotMatch(checklist, /\[Result: Pass\]/);
      if (version === "2.2") assert.doesNotMatch(checklist, /\*\*4\.1\.1 /);
    }
  }
});

test("review scope is persisted through a menu override, and can be reset", () => {
  assert.equal(isReviewScope("AA"), true);
  assert.equal(isReviewScope("AAA"), true);
  assert.equal(isReviewScope("invalid"), false);
  assert.equal(isReviewScope(undefined), false);
  assert.match(REVIEW_SCOPE_STORAGE_KEY, /review-scope/);
  const source = fs.readFileSync(path.join(__dirname, "../src/wcag-explorer.tsx"), "utf8");
  assert.match(source, /LocalStorage\.getItem/);
  assert.match(source, /LocalStorage\.setItem/);
  assert.match(source, /LocalStorage\.removeItem/);
  assert.match(source, /<ActionPanel\.Submenu title="Change Review Scope"/);
  assert.match(source, /title="Copy Review Checklist"/);
  assert.match(source, /title="Open Extension Settings"/);
});

test("scope list subtitle explicitly distinguishes included and hidden levels", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/wcag-explorer.tsx"), "utf8");
  assert.match(source, /AA and AAA excluded/);
  assert.match(source, /AAA excluded/);
  assert.match(source, /\$\{counts\.A\} A \+ \$\{counts\.AA\} AA \+ \$\{counts\.AAA\} AAA/);
  assert.match(source, /title=\{`Review Scope: \$\{reviewScopeLabel\(controls\.scope\)\}`\}/);
});
