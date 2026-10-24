import { Deps } from "../deps";
import { formatMoney } from "../format";
import { asNumber, asRecord, requestJson } from "../http";
import { ProviderError, ProviderUsage, Settings } from "../types";

// Moonshot keeps separate accounts per region, and a key only works on the host that issued it.
const GLOBAL_ORIGIN = "https://api.moonshot.ai";
const CHINA_ORIGIN = "https://api.moonshot.cn";
export const CREATE_KEY_URL = "https://platform.moonshot.ai/console/api-keys";
const AUTH_HINT =
  "Choose Connect Moonshot from this item's actions to enter a new key, " +
  "or check the key and region in the extension preferences";
// Used when the key comes from the preferences. Connect is hidden then, so the hint doesn't name it.
const PREFERENCE_AUTH_HINT = "Check the Moonshot API key and region in the extension preferences";

export async function fetchMoonshotUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const apiKey = settings.moonshotApiKey?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "not-connected",
      "No Moonshot API key",
      "Choose Connect Moonshot from this item's actions.\n" +
        `Or add your Moonshot API key in the extension preferences. Create one at ${CREATE_KEY_URL}`,
    );
  }

  const china = settings.moonshotRegion === "china";
  const json = await requestJson(deps, `${china ? CHINA_ORIGIN : GLOBAL_ORIGIN}/v1/users/me/balance`, {
    provider: "Moonshot",
    headers: { Authorization: `Bearer ${apiKey}` },
    authHint: settings.moonshotApiKeySource === "preference" ? PREFERENCE_AUTH_HINT : AUTH_HINT,
  });
  // China balances are in yuan. International balances are in US dollars.
  return parseMoonshotUsage(json, china ? "CNY" : "USD", deps.now());
}

export function parseMoonshotUsage(json: unknown, currency: string, fetchedAt: number): ProviderUsage {
  const root = asRecord(json);
  if (!root) {
    throw new ProviderError("parse", "Moonshot returned an unexpected balance response");
  }
  // The body repeats the outcome. A failed status or non-zero code is an error even when the HTTP status was 200.
  const code = asNumber(root.code);
  if (root.status === false || (code !== undefined && code !== 0)) {
    throw new ProviderError("http", `Moonshot API error: code ${code ?? "unknown"}`);
  }

  const data = asRecord(root.data);
  const available = asNumber(data?.available_balance);
  if (available === undefined) {
    throw new ProviderError("parse", "Moonshot returned no available balance");
  }
  const voucher = asNumber(data?.voucher_balance);
  const cash = asNumber(data?.cash_balance);

  const notes: string[] = [];
  if (voucher !== undefined && cash !== undefined) {
    notes.push(`Voucher ${formatMoney(voucher, currency)} · Cash ${formatMoney(cash, currency)}`);
  }
  // A negative cash balance means spending has outrun top-ups. Worth a note, since the available figure hides it.
  if (cash !== undefined && cash < 0) {
    notes.push(`Cash balance is negative: ${formatMoney(cash, currency)}`);
  }

  return {
    provider: "moonshot",
    windows: [],
    balances: [{ label: "Available", amount: available, currency }],
    notes,
    source: "API key",
    fetchedAt,
  };
}
