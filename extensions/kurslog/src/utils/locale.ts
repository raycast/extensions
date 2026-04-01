import { getPreferenceValues, environment } from "@raycast/api";
import type { Locale } from "../api/types";

interface Preferences {
  locale: Locale;
}

const SUPPORTED: Locale[] = ["uk", "ru", "en"];

/** Detect locale: user preference → system language → "en" */
export function getLocale(): Locale {
  // 1. Explicit user preference
  const pref = getPreferenceValues<Preferences>().locale;
  if (pref && SUPPORTED.includes(pref)) return pref;

  // 2. System language from Raycast environment
  try {
    const env = environment as unknown as Record<string, string>;
    const sysLang = env.locale || env.languageCode || "";
    const code = sysLang.toLowerCase().slice(0, 2);
    if (code === "uk") return "uk";
    if (code === "ru") return "ru";
    if (code === "en") return "en";
  } catch {
    // environment fields may not exist in older Raycast versions
  }

  // 3. Default
  return "en";
}

/**
 * Get localized name from an object with name_uk, name_ru, name_en fields.
 */
export function getLocalizedName(
  obj: Record<string, unknown>,
  locale: Locale,
  prefix = "name",
): string {
  return (
    (obj[`${prefix}_${locale}`] as string) ||
    (obj[`${prefix}_uk`] as string) ||
    (obj[`${prefix}_en`] as string) ||
    ""
  );
}

/** Localized labels */
const labels: Record<string, Record<Locale, string>> = {
  bestRate: { uk: "Найкращий курс", ru: "Лучший курс", en: "Best Rate" },
  rating: { uk: "Рейтинг", ru: "Рейтинг", en: "Rating" },
  favorites: { uk: "Обрані", ru: "Избранное", en: "Favorites" },
  all: { uk: "Всі", ru: "Все", en: "All" },
  active: { uk: "Активні", ru: "Активные", en: "Active" },
  inactive: { uk: "Неактивні", ru: "Неактивные", en: "Inactive" },
  exchangers: { uk: "обмінників", ru: "обменников", en: "exchangers" },
  reviews: { uk: "відгуків", ru: "отзывов", en: "reviews" },
  pairs: { uk: "пар", ru: "пар", en: "pairs" },
  from: { uk: "Від", ru: "От", en: "From" },
  to: { uk: "До", ru: "До", en: "To" },
  youGive: { uk: "Віддаєте", ru: "Отдаёте", en: "You give" },
  youGet: { uk: "Отримуєте", ru: "Получаете", en: "You get" },
  rate: { uk: "Курс", ru: "Курс", en: "Rate" },
  minAmount: { uk: "Мін. сума", ru: "Мин. сумма", en: "Min amount" },
  maxAmount: { uk: "Макс. сума", ru: "Макс. сумма", en: "Max amount" },
  reserves: { uk: "Резерви", ru: "Резервы", en: "Reserves" },
  trustScore: { uk: "Оцінка довіри", ru: "Оценка доверия", en: "Trust Score" },
  trustStatus: {
    uk: "Статус довіри",
    ru: "Статус доверия",
    en: "Trust Status",
  },
  status: { uk: "Статус", ru: "Статус", en: "Status" },
  currencyPairs: {
    uk: "Валютні пари",
    ru: "Валютные пары",
    en: "Currency Pairs",
  },
  problems: { uk: "Проблем", ru: "Проблем", en: "Problems" },
  popular: { uk: "Популярні", ru: "Популярные", en: "Popular" },
  noRates: { uk: "Немає курсів", ru: "Нет курсов", en: "No rates available" },
  enterAmount: { uk: "Введіть суму", ru: "Введите сумму", en: "Enter amount" },
  amount: { uk: "Сума", ru: "Сумма", en: "Amount" },
  swap: {
    uk: "Поміняти місцями",
    ru: "Поменять местами",
    en: "Swap currencies",
  },
  openInBrowser: {
    uk: "Відкрити в браузері",
    ru: "Открыть в браузере",
    en: "Open in Browser",
  },
  copyRate: { uk: "Копіювати курс", ru: "Копировать курс", en: "Copy Rate" },
  selectFrom: {
    uk: "Оберіть валюту (Віддаєте)",
    ru: "Выберите валюту (Отдаёте)",
    en: "Select currency (You give)",
  },
  selectTo: {
    uk: "Оберіть валюту (Отримуєте)",
    ru: "Выберите валюту (Получаете)",
    en: "Select currency (You get)",
  },
  searchCurrencies: {
    uk: "Пошук валют...",
    ru: "Поиск валют...",
    en: "Search currencies...",
  },
  searchDirections: {
    uk: "Пошук напрямків...",
    ru: "Поиск направлений...",
    en: "Search directions...",
  },
  searchExchangers: {
    uk: "Пошук обмінників...",
    ru: "Поиск обменников...",
    en: "Search exchangers...",
  },
  monitoring: {
    uk: "Моніторинг відгуків",
    ru: "Мониторинг отзывов",
    en: "Review Monitoring",
  },
};

export function t(key: string, locale: Locale): string {
  return labels[key]?.[locale] || labels[key]?.en || key;
}

/** Localized param descriptions for tooltips */
export const paramDescriptions: Record<string, Record<Locale, string>> = {
  manual: {
    uk: "Ручна обробка заявки",
    ru: "Ручная обработка заявки",
    en: "Manual order processing",
  },
  verifying: {
    uk: "Перевірка документів",
    ru: "Проверка документов",
    en: "Document verification required",
  },
  reg: {
    uk: "Потрібна реєстрація",
    ru: "Нужна регистрация",
    en: "Registration required",
  },
  cardverify: {
    uk: "Верифікація картки",
    ru: "Верификация карты",
    en: "Card verification required",
  },
  floating: {
    uk: "Плаваючий курс",
    ru: "Плавающий курс",
    en: "Floating exchange rate",
  },
};
