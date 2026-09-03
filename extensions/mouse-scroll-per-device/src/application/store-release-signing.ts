/**
 * Store-release signing is deliberately stricter than the identity predicate used
 * at runtime. Apple Development is useful for a developer's local TCC probe, but
 * it is not a public-distribution authority.
 */
export const storeHelperIdentifier = "com.brandon.mouse-scroll-per-device.helper";

export interface StoreSigningInspection {
  authority?: string;
  team?: string;
  identifier?: string;
  runtime: boolean;
  timestamp: boolean;
  designatedRequirement?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineValue(inspection: string, key: string): string | undefined {
  return inspection.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();
}

export function parseStoreSigningInspection(inspection: string): StoreSigningInspection {
  const timestamp = lineValue(inspection, "Timestamp");
  return {
    authority: inspection.match(/^Authority=(Developer ID Application:.+)$/m)?.[1],
    team: lineValue(inspection, "TeamIdentifier"),
    identifier: lineValue(inspection, "Identifier"),
    runtime: /^Runtime Version=.+$/m.test(inspection) || /flags=.*\bruntime\b/.test(inspection),
    timestamp: Boolean(timestamp && timestamp.toLowerCase() !== "none"),
    designatedRequirement: inspection.match(/^designated => (.+)$/m)?.[1]?.trim(),
  };
}

export function storeSigningFailure(inspection: StoreSigningInspection): string | undefined {
  if (!inspection.authority) return "Developer ID Application authority is required for a Store release.";
  if (!inspection.team || inspection.team === "not set") return "A nonempty TeamIdentifier is required.";
  if (inspection.identifier !== storeHelperIdentifier) return "The helper identifier is incorrect.";
  if (!inspection.runtime) return "Hardened runtime is required.";
  if (!inspection.timestamp) return "A secure signing timestamp is required.";

  const requirement = inspection.designatedRequirement ?? "";
  const exactIdentifier = new RegExp(`(?:^|\\s)identifier\\s+"${escapeRegExp(storeHelperIdentifier)}"(?:\\s|$)`);
  const appleGenericAnchor = /(?:^|\s)anchor apple generic(?:\s|$)/;
  const exactTeamOU = new RegExp(
    `(?:^|\\s)certificate\\s+leaf\\[subject\\.OU\\]\\s*=\\s*"${escapeRegExp(inspection.team)}"(?:\\s|$)`,
  );
  if (!exactIdentifier.test(requirement) || !appleGenericAnchor.test(requirement) || !exactTeamOU.test(requirement)) {
    return "The designated requirement must bind the exact identifier, Apple anchor, and team OU.";
  }

  return undefined;
}

/** Arguments placed before the helper path in the deterministic release command. */
export function storeCodesignArguments(identity: string): string[] {
  return ["--force", "--timestamp", "--options", "runtime", "--sign", identity, "--identifier", storeHelperIdentifier];
}

export type StoreReleasePublishDisposition = "keep_original" | "replace_atomically";

/**
 * Release orchestration signs and verifies only a sibling temporary copy. This
 * pure decision is intentionally testable without a certificate or codesign.
 */
export function storeReleasePublishDisposition(
  signSucceeded: boolean,
  verificationSucceeded: boolean,
): StoreReleasePublishDisposition {
  return signSucceeded && verificationSucceeded ? "replace_atomically" : "keep_original";
}
