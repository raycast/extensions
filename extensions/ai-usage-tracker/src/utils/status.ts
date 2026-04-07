import { contentText } from "./content-text";

export type StatusKind = "ahead" | "behind" | "neutral" | "idle";

export interface StatusInfo {
  kind: StatusKind;
  delta: number;
  budgetPerDayRaw: number;
  budgetPerDay: string;
  daysLeft: number;
  requestsToday: number;
  message: string;
}

export function computeStatus(usage: number, elapsed: number, total: number, requestCost: number): StatusInfo {
  const monthPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const delta = usage - monthPct;
  const daysLeft = total - elapsed;
  const remaining = 100 - usage;
  const budgetPerDayRaw = daysLeft > 0 ? remaining / daysLeft : 0;
  const budgetPerDay = daysLeft > 0 ? budgetPerDayRaw.toFixed(1) : "—";
  // Requests remaining for TODAY: how many more you can use to end today exactly on track
  const todayEndBudget = total > 0 ? (elapsed / total) * 100 : 0;
  const remainingToday = todayEndBudget - usage;
  const requestsToday = Math.max(0, Math.floor(remainingToday / requestCost));

  if (usage === 0) {
    return {
      kind: "idle",
      delta: 0,
      budgetPerDayRaw: 0,
      budgetPerDay,
      daysLeft,
      requestsToday: 0,
      message: contentText.messageIdle,
    };
  }

  if (delta <= -1) {
    const extraRequests = Math.round(Math.abs(delta) / requestCost);
    return {
      kind: "ahead",
      delta,
      budgetPerDayRaw,
      budgetPerDay,
      daysLeft,
      requestsToday,
      message: contentText.messageAhead({ delta, monthPct, usage, extraRequests, budgetPerDay, daysLeft }),
    };
  }

  if (delta >= 1) {
    return {
      kind: "behind",
      delta,
      budgetPerDayRaw,
      budgetPerDay,
      daysLeft,
      requestsToday,
      message: contentText.messageBehind({ delta, monthPct, usage, budgetPerDay, daysLeft }),
    };
  }

  return {
    kind: "neutral",
    delta,
    budgetPerDayRaw,
    budgetPerDay,
    daysLeft,
    requestsToday,
    message: contentText.messageNeutral({ monthPct, usage, budgetPerDay, daysLeft }),
  };
}
