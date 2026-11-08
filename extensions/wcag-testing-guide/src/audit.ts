/** Locally stored, version-specific results for a single ongoing review. */
import type { Criterion, WcagVersion } from "./types";
import type { ReviewScope } from "./review-scope";
import { criteriaForScope, reviewScopeLabel } from "./review-scope";
import { standardUrl } from "./guide";

export type AuditStatus = "not-tested" | "pass" | "fail" | "not-applicable";
export type AuditResult = {
  status: AuditStatus;
  notes: string;
  updatedAt: string;
};
export type AuditResults = Record<string, AuditResult>;

export const AUDIT_STORAGE_KEY = (version: WcagVersion): string =>
  `wcag-audit-results-${version}-v1`;
export const isAuditStatus = (value: unknown): value is AuditStatus =>
  value === "not-tested" ||
  value === "pass" ||
  value === "fail" ||
  value === "not-applicable";

/** Ignore malformed data and entries that are not valid for the selected WCAG edition. */
export function parseAuditResults(
  raw: unknown,
  validNumbers: ReadonlySet<string>,
): AuditResults {
  if (typeof raw !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const result: AuditResults = {};
    for (const [number, entry] of Object.entries(parsed)) {
      if (
        !validNumbers.has(number) ||
        typeof entry !== "object" ||
        entry === null ||
        Array.isArray(entry)
      )
        continue;
      const record = entry as Record<string, unknown>;
      if (
        !isAuditStatus(record.status) ||
        typeof record.notes !== "string" ||
        record.notes.length > 15000
      )
        continue;
      // Existing records from earlier versions may not contain a timestamp.
      result[number] = {
        status: record.status,
        notes: record.notes,
        updatedAt:
          typeof record.updatedAt === "string" &&
          !Number.isNaN(Date.parse(record.updatedAt))
            ? record.updatedAt
            : "",
      };
    }
    return result;
  } catch {
    return {};
  }
}

export const statusLabel = (status: AuditStatus): string =>
  ({
    "not-tested": "Not tested",
    pass: "Pass",
    fail: "Fail",
    "not-applicable": "Not applicable",
  })[status];

export function auditStats(
  selectedCriteria: Criterion[],
  results: AuditResults,
) {
  const counts = {
    pass: 0,
    fail: 0,
    notApplicable: 0,
    notTested: 0,
    missingEvidence: 0,
  };
  for (const criterion of selectedCriteria) {
    const entry = results[criterion.number];
    const status = entry?.status ?? "not-tested";
    if (status === "pass") counts.pass++;
    else if (status === "fail") counts.fail++;
    else if (status === "not-applicable") counts.notApplicable++;
    else counts.notTested++;
    if (status === "fail" && !entry?.notes.trim()) counts.missingEvidence++;
  }
  const total = selectedCriteria.length;
  const reviewed = total - counts.notTested;
  return {
    ...counts,
    total,
    reviewed,
    progress: total ? Math.round((reviewed / total) * 100) : 0,
  };
}

/** The exported report only covers criteria currently included by the selected scope. */
export function auditReportMarkdown(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
  results: AuditResults,
): string {
  const selected = criteriaForScope(allCriteria, version, scope);
  const s = auditStats(selected, results);
  const lines = [
    `# WCAG ${version} · ${reviewScopeLabel(scope)} · Audit Results`,
    "",
    "**Project / product / journey:** [add name and scope]",
    "**Tester and environment:** [add reviewer, browser/device, AT and versions]",
    `**Exported:** ${new Date().toISOString()}`,
    "",
    `**Progress:** ${s.reviewed}/${s.total} reviewed (${s.progress}%)`,
    `**Pass:** ${s.pass} · **Fail:** ${s.fail} · **Not applicable:** ${s.notApplicable} · **Not tested:** ${s.notTested}`,
    "",
    "> **Not a WCAG conformance statement.** Results are entered by a tester and must be validated against the relevant normative requirements. The scope may be narrower than a complete product, including pages, flows and dynamic states.",
    "",
    "## Findings requiring attention",
    "",
  ];
  const failures = selected.filter((c) => results[c.number]?.status === "fail");
  if (!failures.length)
    lines.push(
      "No failures recorded. This does not mean the product conforms.",
    );
  for (const c of failures) {
    lines.push(
      `- **${c.number} ${c.title} (Level ${c.level}):** ${results[c.number]?.notes.trim() || "Evidence / reproduction steps not recorded"}`,
    );
  }
  lines.push("", "## Results by principle", "");
  for (const principle of [
    "Perceivable",
    "Operable",
    "Understandable",
    "Robust",
  ]) {
    lines.push(`### ${principle}`, "");
    for (const c of selected.filter((item) => item.principle === principle)) {
      const entry = results[c.number];
      const status = entry?.status ?? "not-tested";
      lines.push(
        `- **${c.number} ${c.title}** · Level ${c.level} · **${statusLabel(status)}**`,
      );
      if (entry?.notes.trim())
        lines.push(
          `  - Evidence / justification: ${entry.notes.trim().replace(/\n/g, "\n    ")}`,
        );
      if (entry?.updatedAt) lines.push(`  - Last updated: ${entry.updatedAt}`);
      lines.push(`  - [Official requirement](${standardUrl(c, version)})`);
    }
    lines.push("");
  }
  lines.push(
    "Records from excluded WCAG levels are preserved locally but not counted in this export.",
  );
  return lines.join("\n");
}

/** Neutralise spreadsheet formula injection in user-provided fields before CSV escaping. */
export function csvCell(value: string): string {
  // Excel/Sheets may execute leading = + - @, even after spaces or line breaks.
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function auditReportCsv(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
  results: AuditResults,
): string {
  const rows: string[][] = [
    [
      "WCAG version",
      "Review scope",
      "Criterion",
      "Title",
      "Principle",
      "Level",
      "Status",
      "Evidence or N/A reason",
      "Updated at",
      "Official requirement",
    ],
  ];
  for (const criterion of criteriaForScope(allCriteria, version, scope)) {
    const item = results[criterion.number];
    rows.push([
      version,
      reviewScopeLabel(scope),
      criterion.number,
      criterion.title,
      criterion.principle,
      criterion.level,
      statusLabel(item?.status ?? "not-tested"),
      item?.notes ?? "",
      item?.updatedAt ?? "",
      standardUrl(criterion, version),
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function auditSummaryMarkdown(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
  results: AuditResults,
  projectName = "My First Audit",
): string {
  const selected = criteriaForScope(allCriteria, version, scope);
  const s = auditStats(selected, results);
  const failures = selected.filter((c) => results[c.number]?.status === "fail");
  const pending = selected.filter(
    (c) => (results[c.number]?.status ?? "not-tested") === "not-tested",
  );
  const missing = selected.filter(
    (c) =>
      results[c.number]?.status === "fail" && !results[c.number]?.notes.trim(),
  );
  // Escape audit names before embedding user-entered text into Raycast Markdown.
  const safeProjectName = projectName.replace(/[\\`*_{}[\]()#+.!>|]/g, "\\$&");
  const lines = [
    "# Audit Summary",
    "",
    `**Active audit:** ${safeProjectName}`,
    "",
    "Track your testing here. Open a criterion and choose **Actions → Test Result** to mark Pass, Fail, Not applicable or Not tested. Use **Actions → Manage Audits** to create or switch projects, and **Export HTML Report** or **Export PDF Report** when you're ready to share the results.",
    "",
    `> **WCAG ${version} · ${reviewScopeLabel(scope)}** · ${s.total} criteria in selected scope`,
    "",
    `## ${s.progress}% reviewed (${s.reviewed}/${s.total})`,
    "",
    "| Result | Count |",
    "| :--- | ---: |",
    `| Pass | ${s.pass} |`,
    `| Fail | ${s.fail} |`,
    `| Not applicable | ${s.notApplicable} |`,
    `| Not tested | ${s.notTested} |`,
    "",
    "**Progress measures assessments recorded, not accessibility conformance.** Results are saved only on this device. WCAG 2.1 and 2.2 have separate assessments; changing the A/AA/AAA filter does not delete hidden results.",
    "",
    "## Failures to investigate",
    "",
  ];
  if (failures.length === 0)
    lines.push("No failures recorded yet. This is not proof of conformance.");
  else
    for (const c of failures)
      lines.push(
        `- **${c.number} ${c.title}** (Level ${c.level})${results[c.number]?.notes.trim() ? `: ${results[c.number].notes.trim().replace(/\n/g, " ")}` : " · Add reproduction steps and evidence"}`,
      );
  lines.push("", `## Not tested (${pending.length})`, "");
  if (!pending.length)
    lines.push("All criteria in the selected scope have a recorded result.");
  else
    for (const c of pending)
      lines.push(`- ${c.number} ${c.title} (Level ${c.level})`);
  if (missing.length) {
    lines.push(
      "",
      "## Evidence still needed",
      "",
      "The following Fail results have no notes:",
    );
    for (const c of missing) lines.push(`- ${c.number} ${c.title}`);
  }
  lines.push(
    "",
    "Use **Actions → Export HTML Report** or **Export PDF Report**, or copy Markdown/CSV. Add the tested pages, devices, accessibility settings and browser/assistive-technology versions before sharing.",
    "",
    "A manual audit of complete pages/processes and applicable requirements is needed before any conformance claim.",
  );
  return lines.join("\n");
}
