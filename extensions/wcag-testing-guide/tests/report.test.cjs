const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { criteria } = loadModule("src/data.ts");
const { criteriaForScope } = loadModule("src/review-scope.ts");
const { auditReportHtml, escapeHtml } = loadModule("src/report-html.ts");
const { safeReportBasename, saveAuditReport } = loadModule("src/report-export.ts");

const baseMeta = { project: "QA Portal", scopeDescription: "Search and sign-in", reviewer: "Example Tester", environment: "Safari + VoiceOver", notes: "" };

test("About Me is separate and contains both voluntary support and blog link", () => {
  const { aboutMeMarkdown, supportUrl, authorBlogUrl } = loadModule("src/author.ts");
  const { aboutWcagMarkdown } = loadModule("src/about.ts");
  assert.match(aboutMeMarkdown(), /Łukasz Krause/);
  assert.match(aboutMeMarkdown(), /catsandtests\.blog/);
  assert.match(aboutMeMarkdown(), /a11y-audit\.eu/);
  assert.match(aboutMeMarkdown(), /buycoffee\.to\/a11yaudit/);
  assert.doesNotMatch(aboutWcagMarkdown("2.2"), /## About me|buy me a coffee/i);
  assert.equal(supportUrl, "https://buycoffee.to/a11yaudit");
  assert.equal(authorBlogUrl, "https://catsandtests.blog/");
  const ui = fs.readFileSync(path.resolve(__dirname, "../src/wcag-explorer.tsx"), "utf8");
  assert.match(ui, /<List\.Section title="Guide and Support">[\s\S]*?<AboutMeItem \/>/);
  assert.match(ui, /Visit A11y Audit/);
});

test("N/A notes are optional and no validation prevents saving", () => {
  const ui = fs.readFileSync(path.resolve(__dirname, "../src/audit-ui.tsx"), "utf8");
  assert.doesNotMatch(ui, /A reason is required|status === "not-applicable" && !notes/);
  assert.match(ui, /Why not applicable\? \(Optional\)/);
});

test("HTML report escapes all tester input and contains author, findings and native printable styles", () => {
  const chosen = criteriaForScope(criteria, "2.2", "AA");
  const results = { [chosen[0].number]: { status: "fail", notes: '<script>alert("oops")</script> & Łódź', updatedAt: "2026-11-07T12:03:04Z" }, [chosen[1].number]: { status: "not-applicable", notes: "", updatedAt: "" } };
  const html = auditReportHtml(criteria, "2.2", "AA", results, { ...baseMeta, project: '<img src=x onerror=alert(1)>', notes: "abc & <>" });
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /@media print/);
  assert.match(html, /<thead>/);
  assert.match(html, /<th scope="col">/);
  assert.match(html, /<caption class="sr-only">/);
  assert.match(html, /aria-label="Perceivable results table" tabindex="0"/);
  assert.match(html, /<progress class="native-progress"/);
  assert.match(html, /<a class="skip-link" href="#main-content">/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /2 failures recorded|1 failures recorded/);
  assert.match(html, /Not applicable/);
  assert.match(html, /catsandtests\.blog/);
  assert.match(html, /a11y-audit\.eu/);
  assert.doesNotMatch(html, /buycoffee\.to\/a11yaudit/); // off by default in client reports
  const withSupport = auditReportHtml(criteria, "2.2", "AA", results, { ...baseMeta, includeSupportLink: true });
  assert.match(withSupport, /buycoffee\.to\/a11yaudit/);
  assert.match(html, /&lt;script&gt;alert\(&quot;oops&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
  assert.match(html, /No assessment data was uploaded/);
  assert.equal((html.match(/class="criterion"/g) || []).length, chosen.length);
  assert.match(html, /Not a conformance statement/);
  assert.equal(escapeHtml(`<&'">`), "&lt;&amp;&#39;&quot;&gt;");
});

test("filename is filesystem-safe and HTML export stays local", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wcag-export-test-"));
  try {
    const name = safeReportBasename("Example: Search / Check-out", new Date("2026-11-07T10:00:00Z"));
    assert.match(name, /^WCAG-Example-Search-Check-out-20261107-100000Z$/);
    const saved = await saveAuditReport("<!doctype html><title>Demo</title>", "Example report", "html", { outputDirectory: dir });
    assert.equal(saved.format, "html");
    assert.equal(fs.readFileSync(saved.path, "utf8"), "<!doctype html><title>Demo</title>");
    const second = await saveAuditReport("<html></html>", "Example report", "html", { outputDirectory: dir });
    assert.notEqual(second.path, saved.path);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("PDF fallback is honest and leaves print-ready HTML when the browser fails", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wcag-pdf-fallback-test-"));
  try {
    const saved = await saveAuditReport("<!doctype html><title>Printable</title>", "Check", "pdf", { outputDirectory: dir, browser: "/usr/bin/false" });
    assert.equal(saved.format, "print-ready-html");
    assert.ok(saved.path.endsWith(".html"));
    assert.match(fs.readFileSync(saved.path, "utf8"), /Printable/);
    assert.equal(fs.readdirSync(dir).filter((n) => n.endsWith(".pdf")).length, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("result column has enough space and status labels can wrap in print and small layouts", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/report-html.ts"), "utf8");
  assert.match(source, /th:nth-child\(3\) \{width:23%\}/);
  assert.match(source, /td\.result \.pill \{ max-width:100%; white-space:normal;/);
  assert.match(source, /@media screen and \(max-width:650px\)/);
  assert.match(source, /\.table-wrap table \{ min-width:660px; \}/);
  const html = auditReportHtml(criteria, "2.2", "AA", {}, baseMeta);
  assert.match(html, /<span class="pill not-tested">Not tested<\/span>/);
});

test("report uses concise software credit distinct from audit reviewer and correct WCAG attribution", () => {
  for (const version of ["2.1", "2.2"]) {
    const html = auditReportHtml(criteria, version, "AA", {}, { ...baseMeta, reviewer: "Accessibility QA Team" });
    assert.match(html, /Assessment performed by<\/dt><dd>Accessibility QA Team<\/dd>/);
    assert.match(html, /<h2 id="tool-developer-heading">About the reporting software<\/h2>/);
    assert.match(html, /WCAG Testing Guide<\/strong> is an independent accessibility testing and reporting tool/);
    assert.match(html, /created by <strong>Łukasz Krause<\/strong>/);
    assert.match(html, /Software attribution only/);
    assert.match(html, /does not identify the person or team who performed the assessment/);
    assert.match(html, /<nav aria-label="Software developer's projects">/);
    assert.match(html, /<ul class="footer-links">\s*<li><a href="https:\/\/www\.a11y-audit\.eu\/">A11y Audit<\/a>/);
    assert.match(html, /<li><a href="https:\/\/catsandtests\.blog\/">Cats &amp; Tests<\/a>/);
    assert.match(html, /<h2 id="report-provenance-heading">Report information and WCAG references<\/h2>/);
    assert.match(html, /W3C Document License/);
    assert.match(html, /not a certificate or formal statement of WCAG conformance/);
    assert.match(html, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
    assert.match(html, /@media screen and \(max-width:650px\) \{ \.footer \{ grid-template-columns:1fr/);
    assert.match(html, new RegExp(`Copyright © ${version === "2.2" ? "2020–2024" : "2020–2025"} World Wide Web Consortium`));
    assert.doesNotMatch(html, /buycoffee\.to\/a11yaudit/);
    const withSupport = auditReportHtml(criteria, version, "AA", {}, { ...baseMeta, includeSupportLink: true });
    assert.match(withSupport, /<li><a href="https:\/\/buycoffee\.to\/a11yaudit">Buy Me a Coffee<\/a>/);
  }
});

test("audit summary leads with active project and instructions; project names are escaped", () => {
  const { auditSummaryMarkdown } = loadModule("src/audit.ts");
  const markdown = auditSummaryMarkdown(criteria, "2.2", "AA", {}, "Checkout *API* [QA]");
  assert.ok(markdown.startsWith("# Audit Summary\n\n**Active audit:** Checkout \\*API\\* \\[QA\\]"));
  assert.match(markdown, /Actions → Manage Audits/);
  assert.match(markdown, /Actions → Test Result/);
  assert.match(markdown, /Export HTML Report/);
  assert.match(markdown, /Export PDF Report/);
});

test("audit summary replaces standalone Current Audit screen without removing management", () => {
  const explorer = fs.readFileSync(path.resolve(__dirname, "../src/wcag-explorer.tsx"), "utf8");
  const ui = fs.readFileSync(path.resolve(__dirname, "../src/audit-ui.tsx"), "utf8");
  assert.doesNotMatch(explorer, /function AuditProjectsItem|id="audit-projects"|title="Current Audit"/);
  assert.match(explorer, /<ActionPanel\.Submenu title="Manage Audits"/);
  assert.match(explorer, /Create New Audit…/);
  assert.match(explorer, /Switch to: /);
  assert.match(explorer, /Delete Selected Audit…/);
  assert.match(explorer, /<List\.Section\s+title="Your Audit"[\s\S]*?<AuditSummaryItem[\s\S]*?<ReviewScopeItem/);
  assert.match(ui, /\{auditManagement\}/);
});


test("Audit Summary exposes separate HTML and PDF export actions on list and detail", () => {
  const ui = fs.readFileSync(path.resolve(__dirname, "../src/audit-ui.tsx"), "utf8");
  assert.doesNotMatch(ui, /Export Report \(HTML or PDF\)/);
  assert.equal((ui.match(/title="Export HTML Report"/g) || []).length, 2);
  assert.equal((ui.match(/title="Export PDF Report"/g) || []).length, 2);
  assert.equal((ui.match(/onAction=\{\(\) => openExport\("html"\)\}/g) || []).length, 2);
  assert.equal((ui.match(/onAction=\{\(\) => openExport\("pdf"\)\}/g) || []).length, 2);
  assert.match(ui, /format: "html" \| "pdf";/);
  assert.match(ui, /title=\{`Export \$\{format\.toUpperCase\(\)\} Report`\}/);
  assert.match(ui, /onSubmit=\{\(values: ExportFormValues\) => void exportReport\(values\)\}/);
  assert.match(ui, /format === "html"[\s\S]*?HTML is the recommended accessible format/);
  assert.match(ui, /PDF export uses a local Chrome/);
});
