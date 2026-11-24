import type { ConformanceLevel, Criterion, WcagVersion } from "./types";
import { appliesToVersion } from "./guide";
import {
  internationalRequirementsMarkdown,
  regulatoryReviewFooter,
} from "./legal-guidance";

export type ReviewScope = ConformanceLevel;

export const REVIEW_SCOPE_STORAGE_KEY = "wcag-review-scope-override-v1";

export function isReviewScope(value: unknown): value is ReviewScope {
  return value === "A" || value === "AA" || value === "AAA";
}

export function reviewScopeLabel(scope: ReviewScope): string {
  switch (scope) {
    case "A":
      return "Level A Only";
    case "AA":
      return "A + AA";
    case "AAA":
      return "A + AA + AAA";
  }
}

export function scopeIncludesLevel(
  scope: ReviewScope,
  level: ConformanceLevel,
): boolean {
  const order: Record<ConformanceLevel, number> = { A: 1, AA: 2, AAA: 3 };
  return order[level] <= order[scope];
}

export function criteriaForScope(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
): Criterion[] {
  return allCriteria.filter(
    (criterion) =>
      appliesToVersion(criterion, version) &&
      scopeIncludesLevel(scope, criterion.level),
  );
}

export function reviewLevelCounts(
  allCriteria: Criterion[],
  version: WcagVersion,
) {
  const available = allCriteria.filter((criterion) =>
    appliesToVersion(criterion, version),
  );
  return {
    A: available.filter((criterion) => criterion.level === "A").length,
    AA: available.filter((criterion) => criterion.level === "AA").length,
    AAA: available.filter((criterion) => criterion.level === "AAA").length,
  };
}

export function reviewScopeMarkdown(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
  usesOverride: boolean,
): string {
  const counts = reviewLevelCounts(allCriteria, version);
  const included = criteriaForScope(allCriteria, version, scope);
  const suffix =
    scope === "AA"
      ? " (recommended starting point)"
      : scope === "AAA"
        ? " (extended review)"
        : " (limited review)";
  return [
    "# Your WCAG testing scope",
    "",
    `> **WCAG ${version} · ${reviewScopeLabel(scope)}${suffix}**`,
    "",
    `**${included.length} criteria are visible** in the guide. These are requirements to assess, not tests already passed.`,
    "",
    "## What's included",
    "",
    "| WCAG level | Criteria | In this review |",
    "| :--- | ---: | :--- |",
    `| A · Foundation | ${counts.A} | ${scopeIncludesLevel(scope, "A") ? "Yes" : "No"} |`,
    `| AA · Common compliance target | ${counts.AA} | ${scopeIncludesLevel(scope, "AA") ? "Yes" : "No"} |`,
    `| AAA · Additional improvements | ${counts.AAA} | ${scopeIncludesLevel(scope, "AAA") ? "Yes" : "No"} |`,
    "",
    `**Level AA means Level A + Level AA:** ${counts.A} + ${counts.AA} = ${counts.A + counts.AA} criteria in WCAG ${version}.`,
    "",
    "## Which scope should I choose?",
    "",
    "- **A + AA (recommended):** a practical baseline for many audits and accessibility requirements. Includes every A and AA criterion, not just AA.",
    "- **A only:** useful for learning or a limited preliminary review. It is **not** an AA conformance assessment.",
    "- **A + AA + AAA:** adds advanced success criteria. AAA can guide improvements, but it is **not generally required** by laws that target A + AA; check the rules for your product and jurisdiction.",
    "",
    internationalRequirementsMarkdown(),
    "",
    "## A practical AA vs AAA example",
    "",
    "- **1.4.3 Contrast (Minimum) · AA:** for ordinary text, check at least 4.5:1 contrast, subject to the criterion's exceptions.",
    "- **1.4.6 Contrast (Enhanced) · AAA:** for ordinary text, the stronger target is 7:1, with its own exceptions. Failure of this additional AAA check does not by itself mean Level AA is not met.",
    "",
    "Always check the full normative text, including requirements for large text and exceptions.",
    "",
    "## Make this useful for a real test",
    "",
    "1. Choose the WCAG version required by your project, contract, or regulation.",
    "2. Keep **A + AA** selected for a typical review; extend to AAA when you have a reason to.",
    "3. Open **Audit Summary** to record results and track progress, or choose **Copy Review Checklist** to export a blank checklist.",
    "4. Test each relevant criterion, record evidence and compare with the official W3C requirement.",
    "",
    "## Change the scope",
    "",
    `Current choice: **${usesOverride ? "Saved from the Actions menu" : "Default from extension settings"}**.`,
    "",
    "Use **Actions → Change Review Scope** for an immediate, saved change. **Use Default from Preferences** removes your menu override. **Open Extension Settings** lets you choose the default starting scope.",
    "",
    `[W3C WCAG ${version} conformance rules](https://www.w3.org/WAI/WCAG${version.replace(".", "")}/Understanding/conformance.html)`,
    "",
    regulatoryReviewFooter(),
  ].join("\n");
}

export function reviewChecklistMarkdown(
  allCriteria: Criterion[],
  version: WcagVersion,
  scope: ReviewScope,
): string {
  const included = criteriaForScope(allCriteria, version, scope);
  const principles = [
    "Perceivable",
    "Operable",
    "Understandable",
    "Robust",
  ] as const;
  const lines = [
    `# WCAG ${version} · ${reviewScopeLabel(scope)} · Manual Review Checklist`,
    "",
    `**Scope:** ${included.length} success criteria; start with Not tested for every item.`,
    "**Project / page / flow:** [add scope]",
    "**Environment / assistive technology:** [add details]",
    "**Reviewer / date:** [add details]",
    "",
    "An unchecked box means **not yet assessed**, not a failure. Checkmarks mean only that you reviewed the item; record Pass, Fail, Not applicable or Blocked and supporting evidence separately. This checklist is not a conformance claim.",
  ];
  for (const principle of principles) {
    lines.push("", `## ${principle}`, "");
    for (const c of included.filter((item) => item.principle === principle)) {
      lines.push(
        `- [ ] **${c.number} ${c.title}** · Level ${c.level} · [Result: Not tested] · [Evidence: ]`,
      );
    }
  }
  lines.push(
    "",
    "**Official reference:**",
    `https://www.w3.org/TR/WCAG${version.replace(".", "")}/`,
  );
  return lines.join("\n");
}
