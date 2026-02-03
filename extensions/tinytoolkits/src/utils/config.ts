import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  libreTranslateUrl: string;
  redmineUrl: string;
  defaultTargetLanguage: string;
  enableAutoTranslate: boolean;
  calculatorBackend: string;
}

export function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getLibreTranslateUrl(): string {
  const config = getConfig();
  return config.libreTranslateUrl || "http://localhost:5000";
}

export function getRedmineUrl(): string {
  const config = getConfig();
  return config.redmineUrl || "http://localhost:8084";
}

export function getDefaultTargetLanguage(): string {
  const config = getConfig();
  return config.defaultTargetLanguage || "zh";
}

export function getCalculatorBackend(): string {
  const config = getConfig();
  return config.calculatorBackend || "py";
}
