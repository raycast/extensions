import type { LinkKind } from "./cove";

/** The Cove Telegram bot handle. Hardcoded — not a user preference. */
export const COVE_BOT_USERNAME = "cove_trading_bot";

/** Shape of the preferences as declared in package.json (all strings/booleans). */
export type RawPreferences = {
  amounts: string;
  defaultBuyAction: "g" | "b";
  quickBuyAmount: string;
};

/** Normalized, typed configuration used throughout the command. */
export type Config = {
  amounts: number[];
  defaultBuyAction: LinkKind;
  quickBuyAmount: number;
};

export function parseCsvList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseAmounts(value: string): number[] {
  return parseCsvList(value)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function normalizePreferences(raw: RawPreferences): Config {
  return {
    amounts: parseAmounts(raw.amounts),
    defaultBuyAction: raw.defaultBuyAction === "b" ? "b" : "g",
    quickBuyAmount: Number(raw.quickBuyAmount),
  };
}
