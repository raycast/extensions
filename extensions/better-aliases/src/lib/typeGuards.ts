import type { BetterAliasesConfig, BetterAliasItem } from "../types";

export function isBetterAliasItem(value: unknown): value is BetterAliasItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as BetterAliasItem).value === "string"
  );
}

export function isBetterAliasesConfig(value: unknown): value is BetterAliasesConfig {
  if (typeof value !== "object" || value === null) return false;

  return Object.values(value).every(isBetterAliasItem);
}
