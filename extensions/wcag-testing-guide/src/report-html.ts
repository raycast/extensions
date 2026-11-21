/** A standalone, offline HTML audit report. All untrusted tester input is HTML-escaped. */
import type { Criterion, WcagVersion } from "./types";
import type { ReviewScope } from "./review-scope";
import type { AuditResults, AuditStatus } from "./audit";
import { auditStats, statusLabel } from "./audit";
import { criteriaForScope, reviewScopeLabel } from "./review-scope";
import { standardUrl } from "./guide";
import {
  authorAuditUrl,
  authorBlogUrl,
  authorName,
  supportUrl,
} from "./author";

export type ReportMetadata = {
  project: string;
  scopeDescription: string;
  reviewer: string;
  environment: string;
  notes: string;
  includeSupportLink?: boolean;
};

export const defaultReportMetadata: ReportMetadata = {
  project: "Untitled accessibility review",
  scopeDescription: "",
  reviewer: "",
  environment: "",
  notes: "",
  includeSupportLink: false,
};

/** Escape including quotes, so values are safe in attributes and text nodes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r\n?|\n/g, "<br>");
}

function recordClass(status: AuditStatus): string {
  return {
    pass: "pass",
    fail: "fail",
    "not-tested": "not-tested",
    "not-applicable": "na",
  }[status];
}

function countCard(name: string, count: number, className: string): string {
  return `<div class="count-card ${className}"><span class="count-label">${name}</span><strong class="count-number">${count}</strong></div>`;
}

function metadataItem(label: string, value: string): string {
  return `<div class="meta-item"><dt>${label}</dt><dd>${value.trim() ? textWithBreaks(value) : "Not provided"}</dd></div>`;
}

function criterionRow(
  criterion: Criterion,
  version: WcagVersion,
  results: AuditResults,
): string {
  const record = results[criterion.number];
  const status = record?.status ?? "not-tested";
  const evidence = record?.notes.trim();
  const evidenceHtml = evidence
    ? `<div class="evidence">${textWithBreaks(evidence)}</div>`
    : "";
  const updated = record?.updatedAt
    ? `<span class="date">Updated ${escapeHtml(record.updatedAt.replace("T", " ").slice(0, 16))} UTC</span>`
    : "";
  return `<tr>
    <td class="criterion"><a href="${escapeHtml(standardUrl(criterion, version))}" aria-label="Official WCAG ${version} requirement ${escapeHtml(criterion.number)}: ${escapeHtml(criterion.title)}" rel="noopener noreferrer">${escapeHtml(criterion.number)}</a><span class="criterion-name">${escapeHtml(criterion.title)}</span></td>
    <td class="level">${escapeHtml(criterion.level)}</td>
    <td class="result"><span class="pill ${recordClass(status)}">${statusLabel(status)}</span></td>
    <td>${evidenceHtml || '<span class="muted">No notes recorded</span>'}${updated}</td>
  </tr>`;
}

export function auditReportHtml(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
  results: AuditResults,
  metadata: ReportMetadata,
  generatedAt = new Date(),
): string {
  const selected = criteriaForScope(allCriteria, version, scope);
  const stats = auditStats(selected, results);
  const failures = selected.filter((c) => results[c.number]?.status === "fail");
  const pending = selected.filter(
    (c) => (results[c.number]?.status ?? "not-tested") === "not-tested",
  );
  const noReasonNA = selected.filter(
    (c) =>
      results[c.number]?.status === "not-applicable" &&
      !results[c.number]?.notes.trim(),
  );
  const label = reviewScopeLabel(scope);
  const printedDate =
    generatedAt.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const project = metadata.project.trim() || defaultReportMetadata.project;
  const w3cCopyrightYears = version === "2.2" ? "2020–2024" : "2020–2025";
  const sectionOrder = ["Perceivable", "Operable", "Understandable", "Robust"];

  const failureCards = failures.length
    ? failures
        .map(
          (c) => `<li>
    <div class="finding-top"><span class="id">${escapeHtml(c.number)} · ${escapeHtml(c.title)}</span><span class="pill fail">Fail</span></div>
    <div class="finding-notes">${results[c.number]?.notes.trim() ? textWithBreaks(results[c.number].notes) : "Steps and evidence have not been recorded yet."}</div>
    <a class="reference" href="${escapeHtml(standardUrl(c, version))}">Read official requirement</a>
  </li>`,
        )
        .join("")
    : `<p class="empty">No failures have been recorded. This does not confirm WCAG conformance.</p>`;
  const sections = sectionOrder
    .map((principle) => {
      const group = selected.filter((c) => c.principle === principle);
      return `<section class="principle" aria-labelledby="principle-${principle.toLowerCase()}">
      <div class="section-heading"><h3 id="principle-${principle.toLowerCase()}">${principle}</h3><span>${group.length} criteria</span></div>
      <div class="table-wrap" role="region" aria-label="${principle} results table" tabindex="0"><table><caption class="sr-only">${principle} success criteria and recorded outcomes</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Level</th><th scope="col">Result</th><th scope="col">Notes / evidence</th></tr></thead><tbody>
      ${group.map((c) => criterionRow(c, version, results)).join("\n")}
      </tbody></table></div></section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(project)} | WCAG ${version} Audit Report</title>
<style>
  :root { color-scheme: light; --ink:#152137; --secondary:#51627a; --line:#dde5f0; --paper:#f4f7fb; --blue:#2448b6; --navy:#111e3b; }
  * { box-sizing:border-box; }
  html { font: 15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; }
  body { margin:0; background:var(--paper); color:var(--ink); }
  a { color:#2045a3; text-underline-offset:3px; }
  a:focus-visible { outline:3px solid #a86000; outline-offset:3px; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  .skip-link { position:absolute; top:-60px; left:15px; background:#fff; padding:8px 14px; z-index:5; }
  .skip-link:focus { top:12px; }
  .report { width:min(1080px,calc(100% - 44px)); margin:28px auto 60px; }
  .cover { padding:40px 46px 35px; border-radius:22px; color:#fff; background:linear-gradient(125deg,#142447 2%,#244bb4 75%,#5375d5); }
  .eyebrow { font-size:12px; letter-spacing:.13em; font-weight:800; text-transform:uppercase; opacity:.9; }
  .cover h1 { font-size:clamp(26px,4vw,39px); letter-spacing:-.035em; line-height:1.16; margin:14px 0 10px; max-width:760px; }
  .cover p { color:#e4ecff; margin:0; max-width:800px; }
  .cover-line { display:flex; flex-wrap:wrap; gap:12px; margin-top:25px; }
  .cover-line span { display:inline-block; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.30); padding:5px 12px; border-radius:99px; font-weight:650; font-size:12px; }
  main { display:block; }
  .section { margin-top:23px; background:white; padding:28px 32px; border:1px solid var(--line); border-radius:18px; box-shadow:0 5px 24px rgba(14,35,78,.035); }
  .section h2 { font-size:21px; letter-spacing:-.02em; margin:0 0 16px; }
  .section-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
  .section-heading h3 { font-size:18px; margin:0; }
  .section-heading span { color:var(--secondary); font-size:12px; }
  .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .count-card { display:flex; flex-direction:column; gap:2px; border-radius:12px; border:1px solid var(--line); padding:17px 18px; background:#f8faff; }
  .count-number { font-size:33px; font-weight:780; line-height:1.2; font-variant-numeric:tabular-nums; }
  .count-label { font-size:13px; color:var(--secondary); font-weight:600; }
  .count-card.pass .count-number {color:#12693b} .count-card.fail .count-number {color:#a72a36}
  .count-card.na .count-number {color:#1956a2} .count-card.not-tested .count-number {color:#394a64}
  .progress-caption { display:flex; justify-content:space-between; gap:10px; margin-bottom:10px; }
  .progress-caption strong { font-size:17px; }
  .progress-caption span { color:var(--secondary); }
  .native-progress { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
  .progress-track { height:14px; width:100%; border-radius:99px; background:#e4eafa; overflow:hidden; display:flex; }
  .progress-track .pass {background:#24945b} .progress-track .fail {background:#dd5360}
  .progress-track .na {background:#4886d7}
  .legend { display:flex; flex-wrap:wrap; gap:16px; color:var(--secondary); font-size:12px; padding-top:10px; }
  .legend i { display:inline-block; height:9px; width:9px; border-radius:3px; margin-right:4px; }
  .legend .p {background:#24945b} .legend .f {background:#dd5360} .legend .n {background:#4886d7} .legend .u {background:#e4eafa; border:1px solid #a9b5cf}
  .disclaimer { border-left:4px solid #4d6cb9; border-radius:5px; background:#eef3ff; padding:12px 15px; margin-top:18px; font-size:13px; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 26px; margin:0; }
  .meta-item dt { font-size:12px; text-transform:uppercase; letter-spacing:.06em; font-weight:750; color:var(--secondary); }
  .meta-item dd { margin:2px 0 0; overflow-wrap:anywhere; white-space:normal; }
  .review-note { margin-top:16px; border-top:1px solid var(--line); padding-top:13px; overflow-wrap:anywhere; }
  .findings { list-style:none; margin:0; padding:0; }
  .findings li { padding:16px 0; border-bottom:1px solid var(--line); break-inside:avoid; }
  .findings li:last-child { border-bottom:0; }
  .finding-top { display:flex; align-items:flex-start; gap:12px; justify-content:space-between; font-weight:720; }
  .finding-notes { margin:7px 0 5px; overflow-wrap:anywhere; white-space:normal; }
  .reference { font-size:12px; }
  .empty,.muted { color:var(--secondary); }
  .pill { display:inline-block; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:800; white-space:nowrap; border:1px solid transparent; }
  /* Results table: never let long status labels intrude into evidence cells. */
  td.result { overflow-wrap:normal; word-break:normal; }
  td.result .pill { max-width:100%; white-space:normal; line-height:1.35; text-align:center; overflow-wrap:normal; word-break:normal; }
  .pill.pass { background:#dbf6e7; color:#146538; border-color:#a5dbc0; }
  .pill.fail { background:#ffeaeb; color:#992635; border-color:#f7b7bd; }
  .pill.na { background:#e4f0ff; color:#164f91; border-color:#b6d2f4; }
  .pill.not-tested { background:#f0f2f6; color:#43546b; border-color:#cbd2dd; }
  .table-wrap { overflow-x:auto; }
  .table-wrap:focus-visible { outline:3px solid #b66b0b; outline-offset:3px; }
  @media (prefers-reduced-motion: reduce) { html {scroll-behavior:auto;} }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  th { text-align:left; padding:10px 12px; font-size:11px; text-transform:uppercase; letter-spacing:.055em; color:var(--secondary); background:#f2f5fb; }
  td { border-bottom:1px solid var(--line); padding:11px 12px; vertical-align:top; font-size:12.5px; overflow-wrap:anywhere; }
  tr:last-child td { border-bottom:0; }
  th:nth-child(1) {width:27%} th:nth-child(2) {width:8%} th:nth-child(3) {width:23%} th:nth-child(4) {width:42%}
  .criterion a { font-weight:800; text-decoration:underline; display:block; }
  .criterion-name { display:block; margin-top:2px; }
  .level { font-weight:750; } .evidence { white-space:normal; }
  .date { display:block; font-size:10px; color:var(--secondary); margin-top:5px; }
  .principle + .principle { margin-top:30px; }
  /* Report credits are deliberately separated from audit findings and reviewer identity. */
  .footer { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; border-top:2px solid var(--line); color:var(--secondary); font-size:12px; margin-top:25px; padding-top:20px; overflow-wrap:anywhere; }
  .footer-section { min-width:0; padding:16px 18px; border:1px solid var(--line); border-radius:12px; background:#fff; }
  .footer h2 { font-size:15px; color:var(--ink); margin:0 0 9px; line-height:1.35; }
  .footer p { margin:9px 0; }
  .footer p:first-of-type { margin-top:0; }
  .footer-links { list-style:none; margin:13px 0 0; padding:0; }
  .footer-links li { margin:7px 0 0; padding:0; line-height:1.55; overflow-wrap:anywhere; }
  .footer-links a { font-weight:600; }
  .link-description { color:var(--secondary); }
  .footnote {font-size:11px; color:var(--secondary);}
  @media screen and (max-width:650px) { .footer { grid-template-columns:1fr; gap:12px; } .table-wrap table { min-width:660px; } .report {width:calc(100% - 24px); margin:12px auto 25px} .cover{padding:25px 20px}.section{padding:20px 15px}.cards{grid-template-columns:repeat(2,1fr)}.meta-grid{grid-template-columns:1fr}td,th{padding:8px 6px} }
  @media print {
    @page { size:A4; margin:16mm 13mm; }
    body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; font-size:10px; line-height:1.4; }
    .report { width:100%; margin:0; }
    .cover { border-radius:0; padding:22px 23px; }
    .section { box-shadow:none; border-radius:0; border:0; border-bottom:1px solid #e1e6ef; padding:13px 0 15px; margin-top:0; }
    .section h2,.section-heading { break-after:avoid; }
    thead { display:table-header-group; }
    tr { break-inside:avoid; }
    td { padding:5px 7px; font-size:10.7px; }
    td.result .pill { padding:3px 6px; font-size:10px; }
    .count-card { padding:11px 12px; }
    .cards { margin-bottom:14px; }
    .principle + .principle { margin-top:13px; }
    .findings li { padding:11px 0; }
    .count-card { break-inside:avoid; }
    .principle { break-before:auto; }
    .table-wrap { overflow:visible; }
    .native-progress {display:none;}
    .skip-link { display:none; }
    caption.sr-only { position:static; width:auto; height:auto; clip:auto; display:table-caption; margin:0; overflow:visible; white-space:normal; font-weight:700; text-align:left; color:#394a64; padding:4px 0; }
    a { color:#2045a3; }
    .footer { break-inside:avoid; gap:10px; margin-top:17px; padding-top:14px; font-size:10px; }
    .footer-section { break-inside:avoid; padding:12px 13px; }
    .footer h2 { font-size:12.5px; }
    .footer-links { margin-top:7px; }
    .footer-links li { margin-top:5px; }
    .footer .footnote { font-size:9.5px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to audit results</a>
<div class="report">
<header class="cover"><div class="eyebrow">WCAG Testing Guide · Accessibility Review</div>
<h1>${escapeHtml(project)}</h1>
<p>Manual assessment record · WCAG ${version} · ${escapeHtml(label)} · Exported ${printedDate}</p>
<div class="cover-line"><span>${stats.total} criteria in scope</span><span>${stats.progress}% assessed</span><span>${stats.fail} failures recorded</span></div></header>
<main id="main-content">
<section class="section" aria-labelledby="results-title"><h2 id="results-title">Audit at a glance</h2>
<div class="cards">
  ${countCard("Pass", stats.pass, "pass")}
  ${countCard("Fail", stats.fail, "fail")}
  ${countCard("Not applicable", stats.notApplicable, "na")}
  ${countCard("Not tested", stats.notTested, "not-tested")}
</div>
<div class="progress-caption"><strong>${stats.progress}% of criteria assessed</strong><span>${stats.reviewed} / ${stats.total}</span></div>
<progress class="native-progress" value="${stats.reviewed}" max="${stats.total || 1}" aria-label="Criteria assessed">${stats.reviewed} of ${stats.total}</progress>
<div class="progress-track" aria-hidden="true">
<span class="pass" style="width:${stats.total ? (stats.pass / stats.total) * 100 : 0}%"></span>
<span class="fail" style="width:${stats.total ? (stats.fail / stats.total) * 100 : 0}%"></span>
<span class="na" style="width:${stats.total ? (stats.notApplicable / stats.total) * 100 : 0}%"></span></div>
<div class="legend"><span><i class="p" aria-hidden="true"></i> Pass</span><span><i class="f" aria-hidden="true"></i> Fail</span><span><i class="n" aria-hidden="true"></i> Not applicable</span><span><i class="u" aria-hidden="true"></i> Not tested</span></div>
<div class="disclaimer"><strong>Not a conformance statement.</strong> These are tester-entered results for the selected WCAG version and filtered criteria, not a WCAG score or certification. A formal assessment must cover all applicable requirements, complete pages and user journeys, and relevant states. N/A explanations are optional in this tool, but documenting decisions is recommended.</div>
</section>
<section class="section" aria-labelledby="metadata-title"><h2 id="metadata-title">Review details</h2>
<dl class="meta-grid">
${metadataItem("Product / project", project)}
${metadataItem("Pages / journeys in scope", metadata.scopeDescription)}
${metadataItem("Assessment performed by", metadata.reviewer)}
${metadataItem("Environment / AT", metadata.environment)}
${metadataItem("Exported", printedDate)}
${metadataItem("WCAG edition and level", `WCAG ${version} · ${label}`)}
</dl>
${metadata.notes.trim() ? `<div class="review-note"><strong>Additional review notes</strong><p>${textWithBreaks(metadata.notes)}</p></div>` : ""}
</section>
<section class="section" aria-labelledby="findings-title"><h2 id="findings-title">Findings requiring attention (${failures.length})</h2>
${failures.length ? `<ul class="findings">${failureCards}</ul>` : failureCards}
${pending.length ? `<p class="footnote"><strong>${pending.length} criteria remain Not tested.</strong> Their absence from the findings list is not a passing result.</p>` : ""}
${noReasonNA.length ? `<p class="footnote">${noReasonNA.length} Not applicable ${noReasonNA.length === 1 ? "result has" : "results have"} no explanation (optional, recommended for audit traceability).</p>` : ""}
</section>
<section class="section" aria-labelledby="details-title"><h2 id="details-title">Detailed results</h2>
<p class="muted">Criteria are grouped by POUR principle. Open a criterion number to read its official W3C requirement.</p>
${sections}
</section>
</main>
<footer class="footer" aria-label="Reporting software attribution and standards information">
  <section class="footer-section" aria-labelledby="tool-developer-heading">
    <h2 id="tool-developer-heading">About the reporting software</h2>
    <p><strong>WCAG Testing Guide</strong> is an independent accessibility testing and reporting tool created by <strong>${escapeHtml(authorName)}</strong>, a software tester focused on accessible web and mobile experiences.</p>
    <p class="footnote"><strong>Software attribution only.</strong> This credit does not identify the person or team who performed the assessment. See <a href="#metadata-title">Assessment performed by</a> in Review details.</p>
    <nav aria-label="Software developer's projects">
      <ul class="footer-links">
        <li><a href="${authorAuditUrl}">A11y Audit</a> <span class="link-description">· web accessibility checker</span></li>
        <li><a href="${authorBlogUrl}">Cats &amp; Tests</a> <span class="link-description">· software testing and accessibility blog</span></li>
        ${metadata.includeSupportLink ? `<li><a href="${supportUrl}">Buy Me a Coffee</a> <span class="link-description">· optional support for the free tool</span></li>` : ""}
      </ul>
    </nav>
  </section>
  <section class="footer-section" aria-labelledby="report-provenance-heading">
    <h2 id="report-provenance-heading">Report information and WCAG references</h2>
    <p>This report was generated locally from assessor-entered results. The extension does not independently validate the findings. No assessment data was uploaded to a server by this extension.</p>
    <p class="footnote">WCAG criterion references: <a href="${escapeHtml(`https://www.w3.org/TR/WCAG${version.replace(".", "")}/`)}">Web Content Accessibility Guidelines (WCAG) ${version}</a>. Copyright © ${w3cCopyrightYears} World Wide Web Consortium (W3C®). <a href="https://www.w3.org/copyright/document-license-2023/">W3C Document License</a>.</p>
    <p class="footnote">The official W3C specification is authoritative. This independent report is not endorsed by W3C and is not a certificate or formal statement of WCAG conformance.</p>
  </section>
</footer>
</div>
</body>
</html>`;
}
