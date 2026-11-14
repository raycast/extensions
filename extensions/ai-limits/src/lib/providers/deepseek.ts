import { Deps } from "../deps";
import { formatMoney } from "../format";
import { asArray, asNumber, asRecord, asString, requestJson } from "../http";
import { Balance, ProviderError, ProviderUsage, Settings } from "../types";

const BALANCE_URL = "https://api.deepseek.com/user/balance";
export const CREATE_KEY_URL = "https://platform.deepseek.com/api_keys";
const AUTH_HINT =
  "Choose Connect DeepSeek from this item's actions to enter a new key, or check the key in the extension preferences";
// Used when the key comes from the preferences. Connect is hidden then, so the hint doesn't name it.
const PREFERENCE_AUTH_HINT = "Check the DeepSeek API key in the extension preferences";

interface CurrencyBalance {
  currency: string;
  total: number;
  granted?: number;
  // Credits the user paid for. DeepSeek calls this topped_up_balance.
  paid?: number;
}

export async function fetchDeepSeekUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const apiKey = settings.deepseekApiKey?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "not-connected",
      "No DeepSeek API key",
      "Choose Connect DeepSeek from this item's actions.\n" +
        `Or add your DeepSeek API key in the extension preferences. Create one at ${CREATE_KEY_URL}`,
    );
  }

  const json = await requestJson(deps, BALANCE_URL, {
    provider: "DeepSeek",
    headers: { Authorization: `Bearer ${apiKey}` },
    authHint: settings.deepseekApiKeySource === "preference" ? PREFERENCE_AUTH_HINT : AUTH_HINT,
  });
  return parseDeepSeekUsage(json, deps.now());
}

export function parseDeepSeekUsage(json: unknown, fetchedAt: number): ProviderUsage {
  const root = asRecord(json);
  if (!root) {
    throw new ProviderError("parse", "DeepSeek returned an unexpected balance response");
  }

  const balances = asArray(root.balance_infos)
    .map(parseCurrencyBalance)
    .filter((item): item is CurrencyBalance => item !== undefined);
  if (balances.length === 0) {
    throw new ProviderError("parse", "DeepSeek returned no balance");
  }
  // USD first, then the rest in the order DeepSeek sent them.
  balances.sort((a, b) => Number(b.currency === "USD") - Number(a.currency === "USD"));

  const notes: string[] = [];
  // is_available says whether DeepSeek will spend this balance on API calls. Treat anything but an explicit false as yes.
  if (root.is_available === false) {
    notes.push("Balance can't be used for API calls right now");
  }
  // Only when every currency is empty. A zero in one currency alone is not a reason to top up.
  if (balances.every((item) => item.total <= 0)) {
    notes.push("Add credits at platform.deepseek.com");
  }
  for (const item of balances) {
    const breakdown = breakdownNote(item);
    if (breakdown) {
      // With several currencies, the note says which balance it describes.
      notes.push(balances.length > 1 ? `${item.currency}: ${breakdown}` : breakdown);
    }
  }

  return {
    provider: "deepseek",
    windows: [],
    balances: balances.map((item): Balance => ({ label: "Balance", amount: item.total, currency: item.currency })),
    notes,
    source: "API key",
    fetchedAt,
  };
}

// DeepSeek sends amounts as strings. A row without a usable total is skipped rather than failing the whole answer.
function parseCurrencyBalance(raw: unknown): CurrencyBalance | undefined {
  const record = asRecord(raw);
  const currency = asString(record?.currency);
  const total = asNumber(record?.total_balance);
  if (!record || !currency || total === undefined) {
    return undefined;
  }
  return {
    currency,
    total,
    granted: asNumber(record.granted_balance),
    paid: asNumber(record.topped_up_balance),
  };
}

function breakdownNote(item: CurrencyBalance): string | undefined {
  if (item.paid === undefined && item.granted === undefined) {
    return undefined;
  }
  const parts: string[] = [];
  if (item.paid !== undefined) {
    parts.push(`Paid ${formatMoney(item.paid, item.currency)}`);
  }
  if (item.granted !== undefined) {
    parts.push(`Granted ${formatMoney(item.granted, item.currency)}`);
  }
  return parts.join(" · ");
}
