const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { criteria } = loadModule("src/data.ts");
const { criteriaForScope } = loadModule("src/review-scope.ts");
const {
  AUDIT_STORAGE_KEY, parseAuditResults, auditStats, auditSummaryMarkdown,
  auditReportMarkdown, auditReportCsv, statusLabel,
} = loadModule("src/audit.ts");

test("audit data is version-specific and independent of the A/AA/AAA display filter", () => {
  assert.notEqual(AUDIT_STORAGE_KEY("2.1"), AUDIT_STORAGE_KEY("2.2"));
  const wcag22 = criteriaForScope(criteria, "2.2", "AA");
  assert.equal(wcag22.length, 55);
  const keyed = { [wcag22[0].number]: { status: "fail", notes: "Issue #123", updatedAt: "2026-11-07T00:00:00Z" } };
  assert.equal(auditStats(wcag22, keyed).fail, 1);
  assert.equal(auditStats(criteriaForScope(criteria, "2.2", "AAA"), keyed).fail, 1);
  assert.equal(auditStats(criteriaForScope(criteria, "2.1", "A"), {}).fail, 0);
});

test("audit progress is based on assessed criteria, not on Pass-only rate", () => {
  const selected = criteriaForScope(criteria, "2.2", "AA");
  const example = {
    [selected[0].number]: { status: "pass", notes: "", updatedAt: "" },
    [selected[1].number]: { status: "fail", notes: "See ticket A-7", updatedAt: "" },
    [selected[2].number]: { status: "not-applicable", notes: "No timed media", updatedAt: "" },
    [selected[3].number]: { status: "not-tested", notes: "", updatedAt: "" },
  };
  const summary = auditStats(selected, example);
  assert.deepEqual({ pass: summary.pass, fail: summary.fail, nA: summary.notApplicable, pending: summary.notTested, reviewed: summary.reviewed, total: summary.total },
    { pass: 1, fail: 1, nA: 1, pending: 52, reviewed: 3, total: 55 });
  assert.equal(summary.progress, 5);
  const markdown = auditSummaryMarkdown(criteria, "2.2", "AA", example);
  assert.match(markdown, /5% reviewed \(3\/55\)/);
  assert.match(markdown, /Failures to investigate/);
  assert.match(markdown, /not accessibility conformance/);
  assert.match(markdown, /See ticket A-7/);
});

test("malformed and out-of-version records are ignored", () => {
  const valid21 = new Set(criteriaForScope(criteria, "2.1", "AAA").map((c) => c.number));
  assert.equal(Object.keys(parseAuditResults("garbage", valid21)).length, 0);
  const raw = JSON.stringify({
    "4.1.1": { status: "pass", notes: "observed", updatedAt: "2026-11-07T00:00:00Z" },
    "2.4.11": { status: "fail", notes: "only 2.2", updatedAt: "" },
    "1.1.1": { status: "maybe", notes: "invalid", updatedAt: "" },
    "__proto__": { status: "pass", notes: "not trusted", updatedAt: "" },
  });
  const output = parseAuditResults(raw, valid21);
  assert.equal(Object.keys(output).length, 1);
  assert.equal(output["4.1.1"].status, "pass");
});

test("export reports cover only the active scope and properly escape CSV evidence", () => {
  const onlyA = criteriaForScope(criteria, "2.2", "A");
  const testCriterion = onlyA[0];
  const results = { [testCriterion.number]: { status: "fail", notes: 'Button says "OK", but no name\nOn Safari', updatedAt: "2026-11-07T00:00:00Z" } };
  const csv = auditReportCsv(criteria, "2.2", "A", results);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Button says ""OK"", but no name\nOn Safari"'));
  assert.equal(csv.split('https://www.w3.org/TR/WCAG22/').length - 1, onlyA.length);
  const report = auditReportMarkdown(criteria, "2.2", "A", results);
  assert.match(report, /Not a WCAG conformance statement/);
  assert.match(report, /Button says/);
  assert.match(report, /\*\*Fail:\*\* 1/);
});

test("UI allows an optional Not applicable note and offers reset confirmation", () => {
  const ui = fs.readFileSync(path.resolve(__dirname, "../src/audit-ui.tsx"), "utf8");
  assert.doesNotMatch(ui, /status === "not-applicable" && !notes\.trim\(\)/);
  assert.match(ui, /confirmAlert/);
  assert.match(ui, /Alert\.ActionStyle\.Destructive/);
  assert.match(ui, /Copy Results as CSV/);
  assert.equal(statusLabel("not-tested"), "Not tested");
});
