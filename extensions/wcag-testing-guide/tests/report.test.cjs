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

test("audit summary replaces standalone Current Audit screen without removing management", async () => {
  const React = require("react");
  const { harness } = require("./helpers/raycast.cjs"); const h = harness();
  try {
    const root = await h.mount(React.createElement(h.Command));
    assert.ok(h.action(root, "Manage Audits"));
    assert.ok(h.action(root, "Create New Audit…"));
    assert.equal(h.action(root, "Current Audit"), undefined);
    await h.invoke(root, "Open Audit Summary"); const summary = await h.mount(h.stack.pop());
    assert.ok(h.action(summary, "Manage Audits"));
    assert.ok(h.action(summary, "Create New Audit…"));
  } finally { await h.cleanup(); }
});

test("Audit Summary exposes separate HTML and PDF export actions on list and detail", async () => {
  const React = require("react");
  const { harness } = require("./helpers/raycast.cjs"); const h = harness();
  try {
    const root = await h.mount(React.createElement(h.Command));
    await h.invoke(root, "Open Audit Summary"); const summary = await h.mount(h.stack.pop());
    for (const view of [root, summary]) for (const format of ["HTML", "PDF"]) {
      await h.invoke(view, `Export ${format} Report`);
      const form = await h.mount(h.stack.pop());
      assert.equal(form.root.findByType("Action.SubmitForm").props.title, `Export ${format} Report`);
      const text = form.root.findAllByType("Form.Description").map((node) => node.props.text).join(" ");
      assert.match(text, format === "HTML" ? /HTML is the recommended accessible format/ : /PDF export uses a local Chrome/);
    }
  } finally { await h.cleanup(); }
});

test("concurrent HTML exports reserve different files and preserve both contents", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wcag-concurrent-html-"));
  try {
    const outputs = await Promise.all(Array.from({ length: 12 }, (_, i) => saveAuditReport(`Report ${i}`, "Same project", "html", { outputDirectory: dir })));
    assert.equal(new Set(outputs.map((output) => output.path)).size, 12);
    outputs.forEach((output, i) => assert.equal(fs.readFileSync(output.path, "utf8"), `Report ${i}`));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("concurrent PDF failure preserves unrelated successful output; sandbox stays enabled", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wcag-concurrent-pdf-"));
  try {
    const browser = path.join(dir, "test-browser");
    fs.writeFileSync(browser, `#!${process.execPath}
const fs = require("node:fs");
const { fileURLToPath } = require("node:url");
const args = process.argv.slice(2);
if (args.some((arg) => arg.includes("no-sandbox") || arg.includes("disable-setuid-sandbox"))) process.exit(91);
if (!args.includes("--export-tagged-pdf")) process.exit(92);
const html = fs.readFileSync(fileURLToPath(args.at(-1)), "utf8");
const pdf = args.find((arg) => arg.startsWith("--print-to-pdf=")).slice("--print-to-pdf=".length);
if (html === "FAIL") { fs.writeFileSync(pdf, "partial"); process.exit(1); }
fs.writeFileSync(pdf, "%PDF-1.7\\n" + (html === "UNTAGGED" ? "" : "/StructTreeRoot /MarkInfo") + "x".repeat(1200));
`, { mode: 0o755 });
    const [success, failure] = await Promise.all([
      saveAuditReport("SUCCESS", "Same", "pdf", { browser, outputDirectory: dir }),
      saveAuditReport("FAIL", "Same", "pdf", { browser, outputDirectory: dir }),
    ]);
    assert.equal(success.format, "pdf");
    assert.equal(failure.format, "print-ready-html");
    assert.match(fs.readFileSync(success.path, "utf8"), /\/StructTreeRoot \/MarkInfo/);
    assert.equal(fs.readFileSync(failure.path, "utf8"), "FAIL");
    const untagged = await saveAuditReport("UNTAGGED", "Same", "pdf", { browser, outputDirectory: dir });
    assert.equal(untagged.format, "print-ready-html");
    assert.match(untagged.reason, /without verifiable structure tags/);
    assert.equal(fs.readdirSync(dir).filter((file) => file.endsWith(".pdf")).length, 1);
    assert.ok(fs.existsSync(success.path));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
