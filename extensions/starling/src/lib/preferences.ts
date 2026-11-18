import { getPreferenceValues } from "@raycast/api";

export type ResolvedPreferences = {
  baseUrl: string;
  transactionLookbackDays: number;
  maxTransactions: number;
  defaultCurrency: string;
  useDemoData: boolean;
  personalAccessToken?: string;
};

const STARLING_PRODUCTION_BASE_URL = "https://api.starlingbank.com";
const DEFAULT_TRANSACTION_LOOKBACK_DAYS = 30;
const DEFAULT_MAX_TRANSACTIONS = 80;
const DEFAULT_CURRENCY = "GBP";

function normalizeToken(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withoutQuotes = trimmed.replace(/^["']|["']$/g, "");
  const normalized = withoutQuotes.replace(/^Bearer\s+/i, "").trim();
  return normalized || undefined;
}

export function getResolvedPreferences(): ResolvedPreferences {
  let useDemoData = false;
  let personalAccessToken: string | undefined;
  try {
    const values = getPreferenceValues<Preferences>();
    useDemoData = values.useDemoData === true;
    personalAccessToken = normalizeToken(values.personalAccessToken);
  } catch {
    useDemoData = false;
    personalAccessToken = undefined;
  }

  return {
    baseUrl: STARLING_PRODUCTION_BASE_URL,
    transactionLookbackDays: DEFAULT_TRANSACTION_LOOKBACK_DAYS,
    maxTransactions: DEFAULT_MAX_TRANSACTIONS,
    defaultCurrency: DEFAULT_CURRENCY,
    useDemoData,
    personalAccessToken,
  };
}
