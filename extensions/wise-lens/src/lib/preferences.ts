import { getPreferenceValues } from "@raycast/api";
import { Prefs } from "./types";

function normalizeCurrency(c: string): string {
  const v = c.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(v)) return "";
  return v;
}

const NUMBER_FORMATS = ["en-US", "de-DE", "fr-FR", "de-CH"];

function normalizeNumberFormat(f: string): string {
  return NUMBER_FORMATS.includes(f) ? f : "en-US";
}

export function getPrefs(): Prefs {
  const raw = getPreferenceValues<Preferences>();
  return {
    apiToken: raw.apiToken.trim(),
    displayCurrency: normalizeCurrency(raw.displayCurrency),
    fxTargetCurrency: normalizeCurrency(raw.fxTargetCurrency),
    numberFormat: normalizeNumberFormat(raw.numberFormat),
    hideZeroBalances: raw.hideZeroBalances,
    hideMenuBarBalance: raw.hideMenuBarBalance,
    useSampleData: raw.useSampleData,
  };
}

export function prefsFingerprint(p: Prefs): string {
  const tail = p.apiToken.slice(-8);
  return `${tail}|${p.displayCurrency}|${p.fxTargetCurrency}|${p.numberFormat}|${p.hideZeroBalances ? 1 : 0}|${p.hideMenuBarBalance ? 1 : 0}|${p.useSampleData ? 1 : 0}`;
}
