import { getPreferenceValues } from "@raycast/api";

import { Formatter, Language, createFormatter } from "./format";
import { Strings, strings } from "./strings";

export interface Locale {
  language: Language;
  fmt: Formatter;
  t: Strings;
}

/**
 * Язык берём из настроек расширения; по умолчанию английский — этого требует Store.
 * Тип `Preferences` Raycast генерирует из package.json, поэтому руками его не описываем:
 * иначе он разъедется с манифестом.
 */
export function useLocale(): Locale {
  const { language } = getPreferenceValues<Preferences>();
  const resolved: Language = language === "ru" ? "ru" : "en";
  return { language: resolved, fmt: createFormatter(resolved), t: strings(resolved) };
}
