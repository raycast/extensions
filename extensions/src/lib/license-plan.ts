import { LicenseState, SubscriptionPlan } from "./types";

export function getEffectivePlan(licenseState: LicenseState | null) {
  if (!licenseState || licenseState.status !== "active") {
    return "starter" as const;
  }

  return licenseState.plan;
}

export function getLiveProjectLimit(plan: SubscriptionPlan) {
  if (plan === "starter") {
    return 1;
  }

  return Number.POSITIVE_INFINITY;
}
