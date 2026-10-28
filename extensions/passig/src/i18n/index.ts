/**
 * Localizzazione runtime dell'estensione (Raycast non ha un sistema i18n ufficiale:
 * il manifest `package.json` resta in inglese, la UI a runtime usa `t()`).
 *
 * - `en` è la sorgente: le chiavi sono tipizzate dal dizionario inglese e ogni altra
 *   lingua deve avere le stesse chiavi (`satisfies Record<MessageKey, string>` +
 *   `scripts/check-i18n.mjs` per i placeholder).
 * - Placeholder named `{name}`; plurali con la sintassi ICU minimale
 *   `{count, plural, one {# item} other {# items}}` (categorie da `Intl.PluralRules`).
 * - La lingua attiva viene dalla preferenza `language` (`system` = lingua del Mac).
 */
import { getPreferenceValues } from "@raycast/api";
import { en } from "./en";
import { it } from "./it";
import { es } from "./es";
import { de } from "./de";
import { fr } from "./fr";
import { ptBR } from "./pt-BR";
import { ja } from "./ja";
import { format as formatTemplate, type Params } from "./format";
import { resolveLanguage, type Language } from "./locale";
export { templateArgs } from "./format";

export type MessageKey = keyof typeof en;
export type { Params } from "./format";
export {
  LANGUAGES,
  matchLanguage,
  resolveLanguage,
  systemLanguage,
  type Language,
  type LanguagePreference,
} from "./locale";

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, it, es, de, fr, "pt-BR": ptBR, ja };

let active: Language | null = null;

/** Lingua attiva (letta una volta per processo dalla preferenza `language`). */
export function getLanguage(): Language {
  if (active) return active;
  let pref: string | undefined;
  try {
    pref = getPreferenceValues<{ language?: string }>().language;
  } catch {
    pref = undefined;
  }
  active = resolveLanguage(pref);
  return active;
}

/** Forza la lingua (test / override); `null` torna alla preferenza. */
export function setLanguage(lang: Language | null): void {
  active = lang;
}

/** Locale BCP-47 per `Intl` (es. `pt-BR`, `de`). */
export function getLocale(): string {
  return getLanguage();
}

/** Valore per l'header `Accept-Language`. */
export function acceptLanguage(): string {
  const lang = getLanguage();
  return lang === "en" ? "en" : `${lang}, en;q=0.8`;
}

/** Traduce `key` nella lingua attiva, con fallback alla sorgente inglese. */
export function t(key: MessageKey, params?: Params): string {
  const lang = getLanguage();
  const template = DICTIONARIES[lang][key] ?? en[key] ?? key;
  return formatTemplate(template, params ?? {}, lang);
}

/** Interpola un template nella lingua attiva. */
export function format(template: string, params: Params, lang: Language = getLanguage()): string {
  return formatTemplate(template, params, lang);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(getLocale()).format(n);
}

export function formatDateTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLocale(), options ?? { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date),
  );
}

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat(getLocale(), { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(date),
  );
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(getLocale(), { style: "currency", currency: currency.toUpperCase() }).format(amount);
}
