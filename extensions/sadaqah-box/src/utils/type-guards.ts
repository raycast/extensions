/**
 * Type guards for runtime type checking
 * Replaces unsafe type assertions with proper type narrowing
 */

import type { Ayah, Hadith, QuoteResult } from "../data/quotes";
import type { Box, Currency, Collection, Preset, Sadaqah } from "../types";

// Quote type guards
export function isAyah(data: unknown): data is Ayah {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "surah" in data &&
    "verse" in data &&
    "arabic" in data &&
    "translation" in data &&
    typeof (data as Ayah).id === "string" &&
    typeof (data as Ayah).surah === "string" &&
    typeof (data as Ayah).verse === "string" &&
    typeof (data as Ayah).arabic === "string" &&
    typeof (data as Ayah).translation === "object"
  );
}

export function isHadith(data: unknown): data is Hadith {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "number" in data &&
    "arabic" in data &&
    "translation" in data &&
    "source" in data &&
    typeof (data as Hadith).id === "string" &&
    typeof (data as Hadith).number === "number" &&
    typeof (data as Hadith).arabic === "string" &&
    typeof (data as Hadith).source === "string" &&
    typeof (data as Hadith).translation === "object"
  );
}

export function isQuoteResultAyah(result: QuoteResult): result is { type: "ayah"; data: Ayah } {
  return result.type === "ayah" && isAyah(result.data);
}

export function isQuoteResultHadith(result: QuoteResult): result is { type: "hadith"; data: Hadith } {
  return result.type === "hadith" && isHadith(result.data);
}

// Box type guard
export function isBox(data: unknown): data is Box {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data &&
    "count" in data &&
    "totalValue" in data &&
    "baseCurrencyId" in data &&
    typeof (data as Box).id === "string" &&
    typeof (data as Box).name === "string" &&
    typeof (data as Box).count === "number" &&
    typeof (data as Box).totalValue === "number" &&
    typeof (data as Box).baseCurrencyId === "string"
  );
}

// Currency type guard
export function isCurrency(data: unknown): data is Currency {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "code" in data &&
    "name" in data &&
    typeof (data as Currency).id === "string" &&
    typeof (data as Currency).code === "string" &&
    typeof (data as Currency).name === "string"
  );
}

// Collection type guard
export function isCollection(data: unknown): data is Collection {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "boxId" in data &&
    "emptiedAt" in data &&
    "totalValue" in data &&
    "currencyId" in data &&
    typeof (data as Collection).id === "string" &&
    typeof (data as Collection).boxId === "string" &&
    typeof (data as Collection).emptiedAt === "string" &&
    typeof (data as Collection).totalValue === "number" &&
    typeof (data as Collection).currencyId === "string"
  );
}

// Sadaqah type guard
export function isSadaqah(data: unknown): data is Sadaqah {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "boxId" in data &&
    "value" in data &&
    "currencyId" in data &&
    typeof (data as Sadaqah).id === "string" &&
    typeof (data as Sadaqah).boxId === "string" &&
    typeof (data as Sadaqah).value === "number" &&
    typeof (data as Sadaqah).currencyId === "string"
  );
}

// Preset type guard
export function isPreset(data: unknown): data is Preset {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data &&
    "value" in data &&
    "currencyId" in data &&
    "createdAt" in data &&
    typeof (data as Preset).id === "string" &&
    typeof (data as Preset).name === "string" &&
    typeof (data as Preset).value === "number" &&
    typeof (data as Preset).currencyId === "string" &&
    typeof (data as Preset).createdAt === "string"
  );
}

// Array validation helpers
export function isBoxArray(data: unknown): data is Box[] {
  return Array.isArray(data) && data.every(isBox);
}

export function isCurrencyArray(data: unknown): data is Currency[] {
  return Array.isArray(data) && data.every(isCurrency);
}

export function isPresetArray(data: unknown): data is Preset[] {
  return Array.isArray(data) && data.every(isPreset);
}
