/*
 * The extension's words in English and Arabic. Same terms as the site (apps/web/src/i18n): Lowest sell is the cheapest
 * place to buy, Highest buy is the best place to sell, and the Central Bank is a reference, never a best rate.
 */
import { getPreferenceValues } from "@raycast/api";
import { GENEH_CCY_NAMES, genehFmt } from "./lite.js";

export type Lang = "en" | "ar";

const EN = {
  searchRates: "Search currencies",
  searchBanks: "Search banks",
  searchGold: "Search karats",
  lowSell: "Lowest sell",
  hiBuy: "Highest buy",
  cheapestBuy: "Cheapest place to buy",
  bestSell: "Best place to sell",
  cbe: "Central Bank",
  buy: "Buy",
  sell: "Sell",
  banks: "Banks",
  behind: "Not updated recently",
  gold: "Gold",
  silver: "Silver",
  perGram: "EGP per gram",
  perPound: "EGP a piece",
  ounce: "Ounce in US dollars",
  showBanks: "Show Every Bank",
  copySell: "Copy Lowest Sell",
  copyBuy: "Copy Highest Buy",
  copyPrice: "Copy Sell Price",
  copyResult: "Copy Result",
  open: "Open on Geneh",
  reload: "Reload Prices",
  failed: "Couldn't load prices",
  failedHint: "Check your connection and try again.",
  convertHint: "Type an amount and a currency, such as 100 USD or 50 €",
  convertEmpty: "Type an amount, such as 100 USD",
  atCbe: "At the Central Bank rate",
  atBuy: "If you sell at the best bank",
  atSell: "If you buy at the cheapest bank",
  egp: "EGP",
  updated: "Updated {time}",
  na: "N/A",
};

const AR: typeof EN = {
  searchRates: "ابحث عن عملة",
  searchBanks: "ابحث عن بنك",
  searchGold: "ابحث عن عيار",
  lowSell: "أرخص بيع",
  hiBuy: "أعلى شراء",
  cheapestBuy: "أرخص سعر تشتري به",
  bestSell: "أعلى سعر تبيع به",
  cbe: "البنك المركزي",
  buy: "شراء",
  sell: "بيع",
  banks: "البنوك",
  behind: "لم يتحدث مؤخرا",
  gold: "الذهب",
  silver: "الفضة",
  perGram: "جنيه للجرام",
  perPound: "جنيه للقطعة",
  ounce: "الأوقية بالدولار",
  showBanks: "كل البنوك",
  copySell: "انسخ أرخص بيع",
  copyBuy: "انسخ أعلى شراء",
  copyPrice: "انسخ سعر البيع",
  copyResult: "انسخ النتيجة",
  open: "افتح في جنيه",
  reload: "حدّث الأسعار",
  failed: "تعذر تحميل الأسعار",
  failedHint: "تأكد من الاتصال وحاول مرة أخرى.",
  convertHint: "اكتب مبلغا وعملة، مثل 100 USD أو 50 €",
  convertEmpty: "اكتب مبلغا، مثل 100 USD",
  atCbe: "بسعر البنك المركزي",
  atBuy: "لو بعت في أفضل بنك",
  atSell: "لو اشتريت من أرخص بنك",
  egp: "جنيه",
  updated: "آخر تحديث {time}",
  na: "غير متاح",
};

export type Words = typeof EN;

export function lang(): Lang {
  const { lang } = getPreferenceValues<{ lang?: string }>();
  return lang === "ar" ? "ar" : "en";
}

export const words = (l: Lang): Words => (l === "ar" ? AR : EN);

/** A price the way the site shows it, Arabic-Indic digits in Arabic: 48.50 or ٤٨٫٥٠. */
export const num = (n: number | null | undefined, l: Lang): string => genehFmt(n, l);

export const currencyName = (code: string, l: Lang): string =>
  GENEH_CCY_NAMES[code]?.[l === "ar" ? 1 : 0] ?? code.toUpperCase();

/** "Updated 08:40" in Cairo time, with Arabic-Indic digits in Arabic. */
export function updated(at: string | undefined, l: Lang): string {
  const t = Date.parse(at ?? "");
  if (!isFinite(t)) return "";
  const time = new Date(t).toLocaleTimeString(l === "ar" ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
  return words(l).updated.replace("{time}", time);
}

/** A page on geneh.app: Arabic pages have no language prefix. */
export const genehUrl = (l: Lang, path = ""): string => `https://geneh.app/${l === "ar" ? "" : "en/"}${path}`;

/** Gold and silver names (the site's search.karat words). */
const METALS: Record<string, [string, string]> = {
  xau_24k_g: ["24 karat", "عيار 24"],
  xau_22k_g: ["22 karat", "عيار 22"],
  xau_21k_g: ["21 karat", "عيار 21"],
  xau_18k_g: ["18 karat", "عيار 18"],
  xau_14k_g: ["14 karat", "عيار 14"],
  xau_pound: ["Gold pound", "الجنيه الذهب"],
  xag_999_g: ["999 silver", "فضة 999"],
  xag_925_g: ["925 silver", "فضة 925"],
  xag_900_g: ["900 silver", "فضة 900"],
  xag_800_g: ["800 silver", "فضة 800"],
  xag_600_g: ["600 silver", "فضة 600"],
  xag_pound: ["Silver pound", "الجنيه الفضة"],
};

/** A karat's name, its number in Arabic-Indic digits in Arabic (عيار ٢١). */
export const metalName = (id: string, l: Lang): string =>
  (METALS[id]?.[l === "ar" ? 1 : 0] ?? id).replace(/\d+/g, (d) => (l === "ar" ? num(Number(d), l) : d));
