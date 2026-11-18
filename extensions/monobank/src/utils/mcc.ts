import { Icon } from "@raycast/api";
import mcc from "../data/mcc.json";
import { MccCategory } from "../types";

// From https://github.com/Oleksios/Merchant-Category-Codes (MIT).
const data = mcc as unknown as {
  groups: Record<string, { en: string; uk: string }>;
  codes: Record<string, [group: string, en: string, uk: string]>;
};

const UNKNOWN_GROUP = "NC";

const groupIcons: Record<string, Icon> = {
  AS: Icon.Leaf, // Agricultural services
  CS: Icon.Hammer, // Contract services
  WSM: Icon.Box, // Wholesale suppliers and manufacturers
  AL: Icon.Airplane, // Airlines
  CR: Icon.Key, // Car rent
  HR: Icon.House, // Hotels and resorts
  NC: Icon.QuestionMarkCircle, // Not categorized
  TS: Icon.Car, // Transportation services (taxi, public transport)
  US: Icon.LightBulb, // Utility services, mobile and internet
  SP: Icon.BankNote, // Service providers (transfers, cash, banks)
  ROS: Icon.Store, // Retail outlets (groceries, department stores)
  CV: Icon.Gauge, // Cars and vehicles (fuel, dealers)
  CLS: Icon.Tag, // Clothing stores
  MS: Icon.Cart, // Miscellaneous stores (restaurants, pharmacies, electronics)
  MTS: Icon.Envelope, // Mail and telephone sales
  PS: Icon.Person, // Personal services
  BS: Icon.Desktop, // Business services
  RS: Icon.WrenchScrewdriver, // Repair services
  ES: Icon.FilmStrip, // Entertainment
  PFS: Icon.MedicalSupport, // Professional services (medicine, education, law)
  MO: Icon.TwoPeople, // Membership organizations
  GS: Icon.Building, // Government services
};

export function getCategory(code: number): MccCategory {
  const entry = data.codes[String(code)];
  const group = entry?.[0] ?? UNKNOWN_GROUP;
  const groupNames = data.groups[group];

  return {
    group,
    groupName: groupNames?.en ?? "Not categorized",
    groupNameUk: groupNames?.uk ?? "Не категоризовано",
    name: entry?.[1] ?? "Other",
    nameUk: entry?.[2] ?? "Інше",
    icon: groupIcons[group] ?? Icon.QuestionMarkCircle,
  };
}

/** A category name that budgets and the category picker use, with the icon of its group. */
export interface CategoryOption {
  name: string;
  nameUk: string;
  icon: Icon;
}

let categoryOptions: CategoryOption[] | undefined;

/** Every category name in the dataset, plus "Other" for unknown codes, sorted by name. */
export function getCategoryOptions(): CategoryOption[] {
  if (!categoryOptions) {
    const byName = new Map<string, CategoryOption>();
    for (const [group, name, nameUk] of Object.values(data.codes)) {
      if (!byName.has(name)) byName.set(name, { name, nameUk, icon: groupIcons[group] ?? Icon.QuestionMarkCircle });
    }

    const other = getCategory(-1);
    if (!byName.has(other.name)) byName.set(other.name, { name: other.name, nameUk: other.nameUk, icon: other.icon });

    categoryOptions = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
  }
  return categoryOptions;
}

/** Lowercase, single spaces and one kind of apostrophe, so "М’ясо" matches "м'ясо". */
export function normalizeCategoryText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[’ʼ‘`]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * The English category names `text` means, matched case-insensitively. An English name matches itself only.
 * A Ukrainian name can match several, e.g. "Продукти" is both "Grocery" and "Food stores".
 */
export function resolveCategoryNames(text: string): string[] {
  const query = normalizeCategoryText(text);
  const options = getCategoryOptions();

  const english = options.find((option) => normalizeCategoryText(option.name) === query);
  if (english) return [english.name];

  return options.filter((option) => normalizeCategoryText(option.nameUk) === query).map((option) => option.name);
}

/** The English category name `text` means in English or Ukrainian, or `undefined`. */
export function resolveCategoryName(text: string): string | undefined {
  return resolveCategoryNames(text)[0];
}

/** Up to `limit` category names that contain `text` (or a word of it) in either language, for error messages. */
export function findSimilarCategories(text: string, limit = 8): string[] {
  const words = normalizeCategoryText(text)
    .split(/[\s.,]+/)
    .filter((word) => word.length >= 3);
  if (!words.length) return [];

  const matches = getCategoryOptions().filter((option) => {
    const texts = `${normalizeCategoryText(option.name)}\n${normalizeCategoryText(option.nameUk)}`;
    // Word starts, so "ресторан" finds "Ресторани" and "cafe" finds "Cafe. Restaurants".
    return words.some((word) => texts.includes(word.slice(0, Math.max(3, word.length - 2))));
  });
  return matches.slice(0, limit).map((option) => `${option.name} (${option.nameUk})`);
}

/** The category names of `codes`, without repeats. */
export function getCategoryNamesForCodes(codes: number[]): string[] {
  return [...new Set(codes.map((code) => getCategory(code).name))];
}

/** Whether `code` is in the dataset. Unknown codes all fall into "Other". */
export function isKnownMcc(code: number) {
  return String(code) in data.codes;
}
