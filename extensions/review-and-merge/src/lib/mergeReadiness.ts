export type MergeStateStatus =
  | "BEHIND"
  | "BLOCKED"
  | "CLEAN"
  | "DIRTY"
  | "DRAFT"
  | "HAS_HOOKS"
  | "UNKNOWN"
  | "UNSTABLE";

export type MergeReadiness =
  | { kind: "ready" }
  | { kind: "confirm"; reason: string }
  | { kind: "blocked"; reason: string; autoMergeable: boolean };

export function mergeReadiness(status: MergeStateStatus): MergeReadiness {
  switch (status) {
    case "CLEAN":
    case "HAS_HOOKS":
      return { kind: "ready" };
    case "UNSTABLE":
      return {
        kind: "confirm",
        reason: "Some non-required checks are failing or still running.",
      };
    case "BLOCKED":
      return {
        kind: "blocked",
        reason:
          "Blocked by branch protection: missing review or required checks.",
        autoMergeable: true,
      };
    case "BEHIND":
      return {
        kind: "blocked",
        reason: "Branch is behind the base branch.",
        autoMergeable: true,
      };
    case "DIRTY":
      return {
        kind: "blocked",
        reason: "Merge conflicts with the base branch.",
        autoMergeable: false,
      };
    case "DRAFT":
      return {
        kind: "blocked",
        reason: "Pull request is still a draft.",
        autoMergeable: false,
      };
    case "UNKNOWN":
      return {
        kind: "blocked",
        reason:
          "GitHub is still computing mergeability — try again in a few seconds.",
        autoMergeable: false,
      };
  }
}
