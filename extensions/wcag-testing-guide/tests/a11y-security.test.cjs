const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { csvCell, auditReportCsv } = loadModule("src/audit.ts");
const { criteria } = loadModule("src/data.ts");
const { projectStorageKey, parseAuditProjects, safeActiveProjectId, DEFAULT_PROJECT } = loadModule("src/audit-projects.ts");

test("CSV text fields cannot begin executable spreadsheet formula characters", () => {
  for (const input of ["=1+2", "+SUM(A1:A2)", "-2+3", "@SUM(1)", "  =HYPERLINK(\"example\")", "\n=1+1"]) {
    assert.ok(csvCell(input).startsWith('"\''), input);
  }
  assert.equal(csvCell('Accessible "heading"'), '"Accessible ""heading"""');
  const results = { "1.1.1": { status: "fail", notes: '=HYPERLINK("https://invalid.example", "click")', updatedAt: "" } };
  assert.match(auditReportCsv(criteria, "2.2", "A", results), /"'=HYPERLINK\(""https:\/\/invalid\.example""/);
});

test("named projects are isolated by keys, but legacy results remain accessible", () => {
  const projectId = "f24d67de-9f5d-4a91-8179-af54d223b32a";
  const { AUDIT_STORAGE_KEY } = loadModule("src/audit.ts");
  assert.equal(projectStorageKey("default", "2.2"), AUDIT_STORAGE_KEY("2.2"));
  assert.notEqual(projectStorageKey(projectId, "2.1"), projectStorageKey(projectId, "2.2"));
  assert.notEqual(projectStorageKey(projectId, "2.2"), projectStorageKey("default", "2.2"));
  assert.throws(() => projectStorageKey("../../../secret", "2.2"), /Invalid/);
  const parsed = parseAuditProjects(JSON.stringify([{
    id: projectId, name: " Mobile audit ", createdAt: "2026-11-07T12:00:00Z",
  }, { id: projectId, name: "Duplicate", createdAt: "" }, { id: "unsafe", name: "Other", createdAt: "" }]));
  assert.deepEqual(parsed.map((p) => p.name), [DEFAULT_PROJECT.name, "Mobile audit"]);
  assert.equal(safeActiveProjectId(projectId, parsed), projectId);
  assert.equal(safeActiveProjectId("unavailable", parsed), "default");
});

test("export requests tagged PDFs and rejects missing structure tags", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/report-export.ts"), "utf8");
  assert.match(source, /--export-tagged-pdf/);
  assert.match(source, /\/StructTreeRoot/);
  assert.match(source, /\/MarkInfo/);
  assert.match(source, /print-ready-html/);
});

test("W3C attribution and disclaimer accompany source files", () => {
  const root = path.resolve(__dirname, "..");
  const notices = fs.readFileSync(path.join(root, "THIRD-PARTY-NOTICES.md"), "utf8");
  assert.match(notices, /W3C Recommendation/);
  assert.match(notices, /copyright\/document-license-2023/);
  assert.match(notices, /not affiliated/);
});
