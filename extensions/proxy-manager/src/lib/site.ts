import { matchingPattern } from "./host";
import type { AppRoutingMode } from "./types";

export type SiteState = "tunneled" | "uncovered" | "bypassed" | "routing-off";

export interface SiteDecision {
  state: SiteState;
  /** The enabled target that matches the host, if any. */
  coveredBy: string | null;
}

/**
 * What actually happens to the tab in front of the user. A matching rule is not
 * enough: the rule can be disabled, per-app routing can send the browser direct,
 * or routing can be off altogether.
 */
export function siteDecision(input: {
  host: string;
  targets: { pattern: string; enabled: boolean }[];
  appMode: AppRoutingMode | null;
  routingState: string;
}): SiteDecision {
  const enabled = input.targets.filter((target) => target.enabled);
  const coveredBy = matchingPattern(
    input.host,
    enabled.map((target) => target.pattern),
  );

  if (!coveredBy) return { state: "uncovered", coveredBy: null };
  if (input.appMode === "DIRECT") return { state: "bypassed", coveredBy };
  if (input.routingState === "off" || input.routingState === "stopping") {
    return { state: "routing-off", coveredBy };
  }
  return { state: "tunneled", coveredBy };
}
