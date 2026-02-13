import { existsSync } from "fs";
import { formatResetTimeFromUnixMillisecondsString } from "../format";
import { expandPath, isJwtExpired, readSqliteValue } from "../system";
import { MetricLine } from "../types";

const STATE_DB_PATH = "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb";
const BASE_URL = "https://api2.cursor.sh";
const CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";

interface CursorPlanUsage {
  totalSpend?: number;
  includedSpend?: number;
  remaining?: number;
  limit?: number;
  totalPercentUsed?: number;
  apiPercentUsed?: number;
}

interface CursorSpendLimitUsage {
  individualLimit?: number;
  individualRemaining?: number;
  individualUsed?: number;
}

interface CursorPeriodUsage {
  billingCycleEnd?: string;
  planUsage: CursorPlanUsage;
  spendLimitUsage?: CursorSpendLimitUsage;
}

interface CursorPlanInfo {
  planInfo: {
    planName: string;
    includedAmountCents?: number;
    price?: string;
    billingCycleEnd?: string;
  };
}

const refreshToken = async (dbPath: string): Promise<string> => {
  const refreshTokenValue = readSqliteValue(dbPath, "cursorAuth/refreshToken");

  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshTokenValue,
    }),
  });

  if (!response.ok) {
    throw new Error("Cursor token expired. Sign in again in Cursor.");
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data.shouldLogout) {
    throw new Error("Cursor session expired. Sign in again in Cursor.");
  }
  if (!data.access_token || typeof data.access_token !== "string") {
    throw new Error("Cursor refresh failed.");
  }

  return data.access_token;
};

const fetchUsageAndPlan = async (token: string): Promise<[CursorPeriodUsage, CursorPlanInfo]> => {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Connect-Protocol-Version": "1",
  };
  const body = "{}";

  const [usageResp, planResp] = await Promise.all([
    fetch(`${BASE_URL}/aiserver.v1.DashboardService/GetCurrentPeriodUsage`, {
      method: "POST",
      headers,
      body,
    }),
    fetch(`${BASE_URL}/aiserver.v1.DashboardService/GetPlanInfo`, {
      method: "POST",
      headers,
      body,
    }),
  ]);

  if (!usageResp.ok) throw new Error("Cursor usage request failed.");
  if (!planResp.ok) throw new Error("Cursor plan request failed.");

  const usage = (await usageResp.json()) as CursorPeriodUsage;
  const plan = (await planResp.json()) as CursorPlanInfo;
  return [usage, plan];
};

export const fetchCursor = async (): Promise<MetricLine[]> => {
  const dbPath = expandPath(STATE_DB_PATH);
  if (!existsSync(dbPath)) {
    throw new Error("Cursor not found. Open Cursor and sign in.");
  }

  let token: string;
  try {
    token = readSqliteValue(dbPath, "cursorAuth/accessToken");
  } catch {
    throw new Error("Cursor token not found. Sign in to Cursor.");
  }

  if (isJwtExpired(token)) {
    token = await refreshToken(dbPath);
  }

  const [usage, plan] = await fetchUsageAndPlan(token);
  const pu = usage.planUsage;
  const planName = plan.planInfo.planName;
  const totalPct = pu.totalPercentUsed ?? pu.apiPercentUsed ?? 0;
  const resetsIn = usage.billingCycleEnd ? formatResetTimeFromUnixMillisecondsString(usage.billingCycleEnd) : undefined;

  const lines: MetricLine[] = [
    {
      type: "badge",
      label: "Plan",
      text: planName,
    },
    {
      type: "progress",
      label: "Usage",
      value: totalPct,
      max: 100,
      unit: "percent",
      subtitle: resetsIn,
    },
  ];

  if (pu.limit && pu.limit > 0) {
    const remaining = (pu.remaining ?? 0) / 100;
    const limit = pu.limit / 100;
    lines.push({
      type: "progress",
      label: "Included",
      value: limit - remaining,
      max: limit,
      unit: "dollars",
      subtitle: resetsIn,
    });
  }

  if (usage.spendLimitUsage) {
    const su = usage.spendLimitUsage;
    if (su.individualLimit && su.individualLimit > 0) {
      const rem = (su.individualRemaining ?? 0) / 100;
      const lim = su.individualLimit / 100;
      lines.push({
        type: "progress",
        label: "On-demand",
        value: lim - rem,
        max: lim,
        unit: "dollars",
      });
    }
  }

  return lines;
};
