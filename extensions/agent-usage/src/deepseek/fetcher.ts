import { httpFetch } from "../agents/http.ts";
import type { DeepSeekError, DeepSeekUsage } from "./types.ts";

const DEEPSEEK_BALANCE_API = "https://api.deepseek.com/user/balance";

interface DeepSeekBalanceInfoResponse {
  currency?: unknown;
  total_balance?: unknown;
  granted_balance?: unknown;
  topped_up_balance?: unknown;
}

interface DeepSeekBalanceResponse {
  is_available?: unknown;
  balance_infos?: unknown;
}

function parseBalance(info: DeepSeekBalanceInfoResponse): Omit<DeepSeekUsage, "isAvailable"> | null {
  if (
    typeof info.currency !== "string" ||
    typeof info.total_balance !== "string" ||
    typeof info.granted_balance !== "string" ||
    typeof info.topped_up_balance !== "string"
  ) {
    return null;
  }

  const totalBalance = Number(info.total_balance);
  const grantedBalance = Number(info.granted_balance);
  const toppedUpBalance = Number(info.topped_up_balance);
  if (!Number.isFinite(totalBalance) || !Number.isFinite(grantedBalance) || !Number.isFinite(toppedUpBalance)) {
    return null;
  }

  return {
    currency: info.currency,
    totalBalance,
    grantedBalance,
    toppedUpBalance,
  };
}

export function parseDeepSeekBalance(data: unknown): { usage: DeepSeekUsage | null; error: DeepSeekError | null } {
  if (!data || typeof data !== "object") {
    return { usage: null, error: { type: "parse_error", message: "Invalid DeepSeek API response format" } };
  }

  const response = data as DeepSeekBalanceResponse;
  if (typeof response.is_available !== "boolean" || !Array.isArray(response.balance_infos)) {
    return { usage: null, error: { type: "parse_error", message: "Missing DeepSeek balance data" } };
  }

  const balances = response.balance_infos.map((info) => parseBalance(info as DeepSeekBalanceInfoResponse));
  if (balances.some((balance) => balance === null)) {
    return { usage: null, error: { type: "parse_error", message: "Invalid numeric value in DeepSeek balance data" } };
  }

  const validBalances = balances.filter((balance): balance is NonNullable<typeof balance> => balance !== null);
  const selected = validBalances.find((balance) => balance.currency === "USD" && balance.totalBalance > 0) ??
    validBalances.find((balance) => balance.totalBalance > 0) ??
    validBalances.find((balance) => balance.currency === "USD") ??
    validBalances[0] ?? {
      currency: "USD",
      totalBalance: 0,
      grantedBalance: 0,
      toppedUpBalance: 0,
    };

  return {
    usage: { isAvailable: response.is_available, ...selected },
    error: null,
  };
}

export async function fetchDeepSeekUsage(
  apiKey: string,
): Promise<{ usage: DeepSeekUsage | null; error: DeepSeekError | null }> {
  const { data, error } = await httpFetch({
    url: DEEPSEEK_BALANCE_API,
    token: apiKey,
    headers: { Accept: "application/json" },
    unauthorizedMessage: "DeepSeek API key expired or invalid. Please update it in extension settings.",
  });
  if (error) return { usage: null, error };
  return parseDeepSeekBalance(data);
}
