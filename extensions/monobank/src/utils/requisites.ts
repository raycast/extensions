import { BANK_REQUISITES } from "../data/constants";
import { Account, AccountType } from "../types";

export type RequisitesLanguage = "uk" | "en";

const latin: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
};

// Є, Ї, Й, Ю, Я are spelled differently at the start of a word.
const wordStart: Record<string, string> = { є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya" };

const apostrophes = new Set(["'", "’", "ʼ", "`"]);

/** One lowercase Cyrillic letter in Latin, given the character before it. */
function getLatin(lower: string, previous: string | undefined) {
  // "зг" is "zgh", so it isn't read as "zh".
  if (lower === "г" && previous?.toLowerCase() === "з") return "gh";
  const isWordStart = !isLetter(previous) && !apostrophes.has(previous ?? "");
  return (isWordStart && wordStart[lower]) || latin[lower];
}

const isLetter = (char: string | undefined) => !!char && char.toLowerCase() !== char.toUpperCase();
const isUpper = (char: string | undefined) => isLetter(char) && char === char!.toUpperCase();

/**
 * Ukrainian text in Latin letters, by Ukraine's official transliteration (Cabinet of Ministers Resolution
 * No. 55, 2010): e.g. "Згурський Юлія" → "Zghurskyi Yuliia". Apostrophes and the soft sign are dropped.
 */
export function transliterate(text: string) {
  const chars = [...text];

  return chars
    .map((char, index) => {
      const lower = char.toLowerCase();
      if (apostrophes.has(char)) return "";
      if (!(lower in latin)) return char;

      const previous = chars[index - 1];
      const value = getLatin(lower, previous);

      if (!isUpper(char) || !value) return value;
      // All caps stays all caps, e.g. "ЩУР" → "SHCHUR".
      const next = chars[index + 1];
      return isUpper(previous) || isUpper(next) ? value.toUpperCase() : value[0].toUpperCase() + value.slice(1);
    })
    .join("");
}

/** The bank's MFO, read from a Ukrainian IBAN (the 6 digits after "UA" and the check digits). */
export function getIbanMfo(iban: string) {
  return /^UA\d{2}(\d{6})/.exec(iban.replace(/\s/g, ""))?.[1] ?? BANK_REQUISITES.mfo;
}

const labels: Record<RequisitesLanguage, Record<string, string>> = {
  uk: {
    recipient: "Отримувач",
    fop: "ФОП",
    taxId: "РНОКПП",
    bank: "Банк отримувача",
    edrpou: "Код ЄДРПОУ банку",
    mfo: "МФО банку",
    currency: "Валюта рахунку",
  },
  en: {
    recipient: "Beneficiary",
    fop: "FOP",
    taxId: "Tax ID",
    bank: "Beneficiary bank",
    edrpou: "Bank EDRPOU",
    mfo: "MFO",
    swift: "SWIFT",
    currency: "Account currency",
  },
};

/**
 * An account's payment details for an invoice or a transfer, one "Label: value" per line. Lines without a value
 * (e.g. no tax ID) are left out. The English version transliterates a Cyrillic name and adds the bank's SWIFT.
 */
export function formatRequisites(
  account: Account,
  owner: { name?: string; taxId?: string },
  language: RequisitesLanguage,
) {
  const label = labels[language];
  const name = owner.name?.trim();
  const localName = name && language === "en" && /\p{Script=Cyrillic}/u.test(name) ? transliterate(name) : name;
  const recipient = localName && (account.type === AccountType.FOP ? `${label.fop} ${localName}` : localName);

  const lines: [string | undefined, string | undefined][] = [
    [label.recipient, recipient],
    ["IBAN", account.iban],
    [label.taxId, owner.taxId?.trim()],
    [label.bank, language === "uk" ? BANK_REQUISITES.nameUk : BANK_REQUISITES.nameEn],
    [label.edrpou, BANK_REQUISITES.edrpou],
    [label.mfo, getIbanMfo(account.iban)],
    [label.swift, BANK_REQUISITES.swift],
    [label.currency, account.currency.code !== "UAH" ? account.currency.code : undefined],
  ];

  return lines
    .filter(([key, value]) => key && value)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
