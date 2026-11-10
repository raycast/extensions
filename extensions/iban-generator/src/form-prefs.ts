import { LocalStorage } from "@raycast/api";
import type { IbanFormat } from "./storage";

export interface FormPrefs {
  countryCode: string;
  bankSelection: string;
  format: IbanFormat;
  copyToClipboard: boolean;
}

const PREFS_KEY = "gen-iban-prefs";

export async function loadFormPrefs(): Promise<FormPrefs | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(PREFS_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as FormPrefs;
    if (!parsed.countryCode || !parsed.bankSelection || !parsed.format) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export async function saveFormPrefs(prefs: FormPrefs): Promise<void> {
  await LocalStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
