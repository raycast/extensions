import type { Criterion, WcagVersion } from "./types";
import { reviewedGuidance } from "./reviewed-content";
import { practicalScenarios } from "./qa-scenarios";

const base = (version: WcagVersion) =>
  `https://www.w3.org/WAI/WCAG${version.replace(".", "")}`;

export function standardUrl(
  criterion: Criterion,
  version: WcagVersion,
): string {
  return `https://www.w3.org/TR/WCAG${version.replace(".", "")}/#${criterion.slug}`;
}

export function understandingUrl(
  criterion: Criterion,
  version: WcagVersion,
): string {
  return `${base(version)}/Understanding/${criterion.slug}`;
}

export function quickReferenceUrl(
  criterion: Criterion,
  version: WcagVersion,
): string {
  // WCAG 2.1 Quick Reference redirects to the 2.2 viewer; keep the version
  // filter in the canonical URL so deep links remain version-correct.
  const versionFilter = version === "2.1" ? "?versions=2.1" : "";
  return `https://www.w3.org/WAI/WCAG22/quickref/${versionFilter}#${criterion.slug}`;
}

export function appliesToVersion(
  criterion: Criterion,
  version: WcagVersion,
): boolean {
  if (version === "2.1") return criterion.introduced !== "2.2";
  return !criterion.removedIn22;
}

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function passSummary(text: string): string {
  const sentence = text.replace(/^Pass (?:when|if)\s+/i, "").trim();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function levelCard(criterion: Criterion, version: WcagVersion): string[] {
  return [
    `> **LEVEL ${criterion.level}**`,
    `> WCAG ${version}. ${criterion.principle}. Guideline ${criterion.guideline}.`,
  ];
}

export function criterionMarkdown(
  criterion: Criterion,
  version: WcagVersion,
  mode: "preview" | "full" = "full",
): string {
  const guidance = reviewedGuidance(criterion);
  const scenario = practicalScenarios[criterion.number];
  const versionNote = criterion.removedIn22
    ? "> **Version note:** This criterion applies to WCAG 2.1. It is obsolete and was removed from WCAG 2.2.\n\n"
    : criterion.introduced === "2.2"
      ? "> **New in WCAG 2.2.**\n\n"
      : "";

  if (mode === "preview") {
    return [
      `# ${criterion.number} ${criterion.title}`,
      "",
      ...levelCard(criterion, version),
      "",
      versionNote.trimEnd(),
      versionNote ? "" : undefined,
      "## In plain language",
      "",
      guidance.plain,
      "",
      `**Who benefits:** ${guidance.benefits}`,
      "",
      "## What it requires",
      "",
      guidance.technical,
      "",
      "### Implementation priorities",
      "",
      list(guidance.implementation.slice(0, 3)),
      "",
      "### Quick test",
      "",
      numberedList(guidance.tests.slice(0, 3)),
      "",
      `> **Expected for PASS:** ${passSummary(guidance.pass)}`,
      "",
      "---",
      "",
      "Press **Enter** to open the complete implementation and testing guide.",
      "",
      "Official W3C references are available in the full guide.",
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  }

  return [
    `# ${criterion.number} ${criterion.title}`,
    "",
    ...levelCard(criterion, version),
    "",
    versionNote.trimEnd(),
    versionNote ? "" : undefined,
    "---",
    "",
    "## In plain language",
    "",
    guidance.plain,
    "",
    "### Who benefits",
    "",
    guidance.benefits,
    "",
    "---",
    "",
    "## What WCAG requires",
    "",
    guidance.technical,
    "",
    ...(guidance.scope.length > 0
      ? ["### Scope and exceptions", "", list(guidance.scope), ""]
      : []),
    "---",
    "",
    "## How to implement it",
    "",
    list(guidance.implementation),
    "",
    "---",
    "",
    "## How to test it",
    "",
    numberedList(guidance.tests),
    "",
    ...(scenario
      ? [
          "### Practical QA scenarios",
          "",
          "**Web: additional checks**",
          "",
          numberedList(scenario.web),
          "",
          "**Native mobile: adapted checks**",
          "",
          "_Native-app examples are informative testing suggestions. Apply WCAG2ICT and relevant platform requirements; CSS-pixel thresholds and HTML/ARIA techniques are not automatically native-app requirements._",
          "",
          numberedList(scenario.mobile),
          "",
          "**Example of a failure:** " + scenario.commonFailure,
          "",
          "**Evidence worth collecting:** " + scenario.evidence,
          "",
        ]
      : []),
    "### Pass condition",
    "",
    `> **Expected for PASS:** ${passSummary(guidance.pass)}`,
    "",
    "### What automation can and cannot do",
    "",
    guidance.automation,
    "",
    ...(guidance.failures.length > 0 || guidance.related.length > 0
      ? [
          "---",
          "",
          ...(guidance.failures.length > 0
            ? ["## Common failures", "", list(guidance.failures), ""]
            : []),
          ...(guidance.related.length > 0
            ? ["### Related criteria", "", list(guidance.related), ""]
            : []),
        ]
      : []),
    "---",
    "",
    "## Official W3C resources",
    "",
    `- [Read the normative success criterion](${standardUrl(criterion, version)})`,
    `- [Read Understanding ${criterion.number}](${understandingUrl(criterion, version)})`,
    `- [Open How to Meet WCAG (Quick Reference)](${quickReferenceUrl(criterion, version)})`,
    "",
    "_A PASS statement above describes what must be demonstrated; it is not a recorded test result. This independent guide is not a replacement for normative WCAG text or WCAG2ICT interpretation for native applications._",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

/** A reusable, unexecuted manual test case for an accessibility audit. */
export function testCaseMarkdown(
  criterion: Criterion,
  version: WcagVersion,
): string {
  const guidance = reviewedGuidance(criterion);
  const scenario = practicalScenarios[criterion.number];
  return [
    `# WCAG ${version} — ${criterion.number} ${criterion.title} (Level ${criterion.level})`,
    "",
    "**Test ID:** [e.g. A11Y-001]",
    "**Page/screen and journey:** [URL, screen, step in process]",
    "**Build / environment:** [version, OS, device, browser, viewport or text size]",
    "**Assistive technology / input:** [name and version, if used]",
    "**Component and state:** [default, error, focused, expanded, etc.]",
    "**Test status:** Not tested",
    "",
    "## Requirement and applicability",
    "",
    guidance.technical,
    "",
    ...(guidance.scope.length > 0
      ? [
          "### Conditions and exceptions to consider",
          "",
          list(guidance.scope),
          "",
        ]
      : []),
    "**Applicable?** [Yes / No, with reason]",
    "",
    "## Manual test steps",
    "",
    numberedList(guidance.tests),
    "",
    ...(scenario
      ? [
          "## Platform-specific test ideas",
          "",
          "**Web**",
          "",
          list(scenario.web),
          "",
          "**Native mobile (informative WCAG2ICT adaptation)**",
          "",
          list(scenario.mobile),
          "",
        ]
      : []),
    "## Expected result (PASS condition)",
    "",
    passSummary(guidance.pass),
    "",
    "## Actual result and evidence",
    "",
    "- **Actual result:** [observed behavior, exact output / measured value]",
    ...(scenario ? [`- **Suggested evidence:** ${scenario.evidence}`] : []),
    "- **Evidence location:** [screenshot / recording / accessibility-tree / measurements]",
    "- **Result:** [Not tested / Pass / Fail / Not applicable / Blocked]",
    "- **Reason for exception or N/A:** [normative basis, if applicable]",
    "- **Defect ID and severity:** [if a failure was confirmed; severity is not the WCAG level]",
    "- **Retest date and outcome:** [when relevant]",
    "",
    `**Normative WCAG source:** ${standardUrl(criterion, version)}`,
    "",
    "_This template records no PASS by default. Confirm criterion applicability and its exact exceptions using the normative source. For native apps, consult W3C WCAG2ICT and platform requirements._",
  ].join("\n");
}
