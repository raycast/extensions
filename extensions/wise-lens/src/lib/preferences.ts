import { getPreferenceValues } from "@raycast/api";
import { Prefs } from "./types";

interface RawPrefs {
  apiToken: string;
  displayCurrency?: string;
  fxTargetCurrency?: string;
  locale?: string;
  hideZeroBalances?: boolean;
  hideMenuBarBalance?: boolean;
  useSampleData?: boolean;
}

function normalizeCurrency(c: string | undefined): string {
  const v = (c ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(v)) return "";
  return v;
}

function normalizeLocale(l: string | undefined): string {
  const v = (l ?? "").trim();
  return v || "en-US";
}

export function getPrefs(): Prefs {
  const raw = getPreferenceValues<RawPrefs>();
  return {
    apiToken: (raw.apiToken ?? "").trim(),
    displayCurrency: normalizeCurrency(raw.displayCurrency),
    fxTargetCurrency: normalizeCurrency(raw.fxTargetCurrency),
    locale: normalizeLocale(raw.locale),
    hideZeroBalances: raw.hideZeroBalances ?? true,
    hideMenuBarBalance: raw.hideMenuBarBalance ?? false,
    useSampleData: raw.useSampleData ?? false,
  };
}

export function prefsFingerprint(p: Prefs): string {
  const tail = p.apiToken.slice(-8);
  return `${tail}|${p.displayCurrency}|${p.fxTargetCurrency}|${p.locale}|${p.hideZeroBalances ? 1 : 0}|${p.hideMenuBarBalance ? 1 : 0}|${p.useSampleData ? 1 : 0}`;
}
