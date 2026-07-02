import type { CursorUsage } from "./types";

export interface CursorUsageSummary {
  billingCycleStart?: string | null;
  billingCycleEnd?: string | null;
  membershipType?: string | null;
  limitType?: string | null;
  isUnlimited?: boolean | null;
  individualUsage?: {
    plan?: CursorPlanUsage | null;
    onDemand?: CursorMoneyUsage | null;
    overall?: CursorMoneyUsage | null;
  } | null;
  teamUsage?: {
    onDemand?: CursorMoneyUsage | null;
    pooled?: CursorMoneyUsage | null;
  } | null;
}

interface CursorPlanUsage extends CursorMoneyUsage {
  autoPercentUsed?: number | null;
  apiPercentUsed?: number | null;
  totalPercentUsed?: number | null;
}

interface CursorMoneyUsage {
  enabled?: boolean | null;
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
}

export interface CursorUserInfo {
  email?: string | null;
  name?: string | null;
  sub?: string | null;
}

export interface CursorRequestUsageResponse {
  "gpt-4"?: {
    numRequests?: number | null;
    numRequestsTotal?: number | null;
    maxRequestUsage?: number | null;
  } | null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizePercent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? clampPercent(value) : null;
}

function centsToUsd(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value / 100 : 0;
}

function formatMembershipType(type: string | null): string {
  if (!type) {
    return "Unknown";
  }

  switch (type.toLowerCase()) {
    case "enterprise":
      return "Cursor Enterprise";
    case "pro":
      return "Cursor Pro";
    case "hobby":
      return "Cursor Hobby";
    case "team":
      return "Cursor Team";
    default:
      return `Cursor ${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  }
}

function makeRateWindow(usedPercent: number, resetsAt: string | null): CursorUsage["total"] {
  const clampedUsed = clampPercent(usedPercent);
  return {
    usedPercent: clampedUsed,
    percentageRemaining: Math.max(0, 100 - clampedUsed),
    resetsAt,
  };
}

export function parseCursorUsage(
  summary: CursorUsageSummary,
  userInfo: CursorUserInfo | null,
  requestUsage: CursorRequestUsageResponse | null,
  source: string,
): CursorUsage {
  const billingCycleEnd = summary.billingCycleEnd ?? null;
  const plan = summary.individualUsage?.plan;
  const autoPercent = normalizePercent(plan?.autoPercentUsed);
  const apiPercent = normalizePercent(plan?.apiPercentUsed);

  const planUsedRaw = typeof plan?.used === "number" ? plan.used : 0;
  const planLimitRaw = typeof plan?.limit === "number" ? plan.limit : 0;
  const overallUsedRaw = summary.individualUsage?.overall?.used;
  const overallLimitRaw = summary.individualUsage?.overall?.limit;
  const pooledUsedRaw = summary.teamUsage?.pooled?.used;
  const pooledLimitRaw = summary.teamUsage?.pooled?.limit;

  const totalPercent = (() => {
    const totalPercentUsed = normalizePercent(plan?.totalPercentUsed);
    if (totalPercentUsed !== null) return totalPercentUsed;
    if (planLimitRaw > 0) return clampPercent((planUsedRaw / planLimitRaw) * 100);
    if (apiPercent !== null) return apiPercent;
    if (autoPercent !== null) return autoPercent;
    if (typeof overallUsedRaw === "number" && typeof overallLimitRaw === "number" && overallLimitRaw > 0) {
      return clampPercent((overallUsedRaw / overallLimitRaw) * 100);
    }
    if (typeof pooledUsedRaw === "number" && typeof pooledLimitRaw === "number" && pooledLimitRaw > 0) {
      return clampPercent((pooledUsedRaw / pooledLimitRaw) * 100);
    }
    return 0;
  })();

  const planUsd = (() => {
    if (planLimitRaw > 0 || planUsedRaw > 0) {
      return { used: planUsedRaw / 100, limit: planLimitRaw / 100 };
    }
    if (typeof overallUsedRaw === "number" && typeof overallLimitRaw === "number") {
      return { used: overallUsedRaw / 100, limit: overallLimitRaw / 100 };
    }
    if (typeof pooledUsedRaw === "number" && typeof pooledLimitRaw === "number") {
      return { used: pooledUsedRaw / 100, limit: pooledLimitRaw / 100 };
    }
    return { used: 0, limit: 0 };
  })();

  const requestModel = requestUsage?.["gpt-4"];
  const requestsUsed = requestModel?.numRequestsTotal ?? requestModel?.numRequests ?? null;
  const requestsLimit = requestModel?.maxRequestUsage ?? null;
  const legacyRequests =
    typeof requestsUsed === "number" && typeof requestsLimit === "number" && requestsLimit > 0
      ? { used: requestsUsed, limit: requestsLimit, usedPercent: (requestsUsed / requestsLimit) * 100 }
      : null;

  const onDemandUsedUsd = centsToUsd(summary.individualUsage?.onDemand?.used);
  const onDemandLimitUsd = summary.individualUsage?.onDemand?.limit;
  const teamOnDemandUsedUsd = summary.teamUsage?.onDemand?.used;
  const teamOnDemandLimitUsd = summary.teamUsage?.onDemand?.limit;
  const resolvedOnDemand = (() => {
    if (typeof onDemandLimitUsd === "number" && onDemandLimitUsd > 0) {
      return { usedUsd: onDemandUsedUsd, limitUsd: onDemandLimitUsd / 100, personalUsedUsd: null };
    }
    if (typeof teamOnDemandLimitUsd === "number" && teamOnDemandLimitUsd > 0) {
      return {
        usedUsd: centsToUsd(teamOnDemandUsedUsd),
        limitUsd: teamOnDemandLimitUsd / 100,
        personalUsedUsd: onDemandUsedUsd > 0 ? onDemandUsedUsd : null,
      };
    }
    if (onDemandUsedUsd > 0) {
      return { usedUsd: onDemandUsedUsd, limitUsd: null, personalUsedUsd: null };
    }
    return null;
  })();

  return {
    account: userInfo?.email ?? formatMembershipType(summary.membershipType ?? null),
    source,
    total: makeRateWindow(legacyRequests?.usedPercent ?? totalPercent, billingCycleEnd),
    auto: legacyRequests || autoPercent === null ? null : makeRateWindow(autoPercent, billingCycleEnd),
    api: legacyRequests || apiPercent === null ? null : makeRateWindow(apiPercent, billingCycleEnd),
    onDemand: resolvedOnDemand ? { ...resolvedOnDemand, resetsAt: billingCycleEnd } : null,
    legacyRequests,
    planUsedUsd: planUsd.used,
    planLimitUsd: planUsd.limit,
    billingCycleStart: summary.billingCycleStart ?? null,
    billingCycleEnd,
    membershipType: summary.membershipType ?? null,
    accountEmail: userInfo?.email ?? null,
    accountName: userInfo?.name ?? null,
  };
}
