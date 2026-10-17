export type Language = "en" | "ru";

export const DASH = "—";

const CURRENCY_SIGNS: Record<string, string> = {
  SUR: "₽",
  RUB: "₽",
  USD: "$",
  EUR: "€",
  CNY: "¥",
  GBP: "£",
  CHF: "₣",
  TRY: "₺",
  KZT: "₸",
};

export function currencySign(unit: string | null | undefined): string {
  if (!unit) return "";
  return CURRENCY_SIGNS[unit] ?? unit;
}

/** Русская форма числительного: 1 день, 2 дня, 5 дней. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  // Дробные всегда идут в родительном единственном: 1,2 года, 7,4 лет → «года».
  if (!Number.isInteger(n)) return few;
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function pluralEn(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ───────────────────────── даты, не зависящие от языка ─────────────────────────

export function parseIsoDate(iso: string | null | undefined): [number, number, number] | null {
  if (!iso || typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return [y, m, d];
}

/** Сегодняшняя дата по Москве в формате YYYY-MM-DD — торговый день считаем по бирже, не по Mac. */
export function todayMsk(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toUtcDays(iso: string): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const [y, m, d] = parsed;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Разница в днях между датой и сегодня (МСК). Положительная — в будущем. */
export function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = toUtcDays(iso);
  const today = toUtcDays(todayMsk());
  if (target === null || today === null) return null;
  return target - today;
}

// ───────────────────────── форматтер ─────────────────────────

export interface Formatter {
  readonly language: Language;
  num(value: number | null | undefined, digits?: number): string;
  loose(value: number | null | undefined, maxDigits?: number): string;
  pct(value: number | null | undefined, digits?: number): string;
  signedPct(value: number | null | undefined, digits?: number): string;
  money(value: number | null | undefined, unit: string | null | undefined, digits?: number): string;
  bigMoney(value: number | null | undefined, unit: string | null | undefined): string;
  date(iso: string | null | undefined): string;
  until(iso: string | null | undefined): string | null;
  couponFrequency(periodDays: number | null | undefined): string | null;
  duration(days: number | null | undefined): string;
  listLevel(level: number | null | undefined): string;
}

const BIG_SUFFIXES: Record<Language, [string, string, string]> = {
  en: ["bn", "m", "k"],
  ru: ["млрд", "млн", "тыс."],
};

export function createFormatter(language: Language): Formatter {
  const locale = language === "ru" ? "ru-RU" : "en-US";
  // В русском проценты и знак валюты отбиваются пробелом, в английском — нет.
  const pctGap = language === "ru" ? " " : "";

  const num = (value: number | null | undefined, digits = 2): string =>
    value === null || value === undefined || Number.isNaN(value)
      ? DASH
      : value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const loose = (value: number | null | undefined, maxDigits = 2): string =>
    value === null || value === undefined || Number.isNaN(value)
      ? DASH
      : value.toLocaleString(locale, { maximumFractionDigits: maxDigits });

  const days = (n: number): string =>
    language === "ru" ? `${n} ${pluralRu(n, "день", "дня", "дней")}` : `${n} ${pluralEn(n, "day", "days")}`;

  const years = (n: number, text: string): string =>
    language === "ru" ? `${text} ${pluralRu(n, "год", "года", "лет")}` : `${text} ${pluralEn(n, "year", "years")}`;

  const months = (n: number): string =>
    language === "ru" ? `${n} ${pluralRu(n, "месяц", "месяца", "месяцев")}` : `${n} ${pluralEn(n, "month", "months")}`;

  function humanSpan(total: number): string {
    if (total < 60) return days(total);

    let y = Math.floor(total / 365.25);
    let m = Math.round((total - y * 365.25) / 30.44);
    // Округление вверх до 12 месяцев — это следующий год, а не «ноль месяцев».
    if (m >= 12) {
      y += 1;
      m = 0;
    }

    if (y === 0) return months(m);
    const yearsText = years(y, String(y));
    if (m === 0) return yearsText;
    return language === "ru" ? `${yearsText} ${m} мес.` : `${yearsText} ${m} mo`;
  }

  return {
    language,
    num,
    loose,

    pct: (value, digits = 2) =>
      value === null || value === undefined || Number.isNaN(value) ? DASH : `${num(value, digits)}${pctGap}%`,

    signedPct: (value, digits = 2) => {
      if (value === null || value === undefined || Number.isNaN(value)) return DASH;
      return `${value > 0 ? "+" : ""}${num(value, digits)}${pctGap}%`;
    },

    money: (value, unit, digits = 2) => {
      if (value === null || value === undefined || Number.isNaN(value)) return DASH;
      const sign = currencySign(unit);
      return sign ? `${loose(value, digits)} ${sign}` : loose(value, digits);
    },

    bigMoney: (value, unit) => {
      if (value === null || value === undefined || Number.isNaN(value)) return DASH;
      const [bn, m, k] = BIG_SUFFIXES[language];
      const abs = Math.abs(value);
      let text: string;
      if (abs >= 1e9) text = `${loose(value / 1e9, 2)} ${bn}`;
      else if (abs >= 1e6) text = `${loose(value / 1e6, 2)} ${m}`;
      else if (abs >= 1e3) text = `${loose(value / 1e3, 1)} ${k}`;
      else text = loose(value, 0);
      const sign = currencySign(unit);
      return sign ? `${text} ${sign}` : text;
    },

    date: (iso) => {
      const parsed = parseIsoDate(iso);
      if (!parsed) return DASH;
      const [y, m, d] = parsed;
      if (language === "ru") return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },

    until: (iso) => {
      const diff = daysFromToday(iso);
      if (diff === null) return null;
      if (diff === 0) return language === "ru" ? "сегодня" : "today";
      const text = humanSpan(Math.abs(diff));
      if (language === "ru") return diff > 0 ? `через ${text}` : `${text} назад`;
      return diff > 0 ? `in ${text}` : `${text} ago`;
    },

    couponFrequency: (periodDays) => {
      if (!periodDays || periodDays <= 0) return null;
      const times = Math.round(365 / periodDays);
      const named: Record<Language, Record<number, string>> = {
        ru: {
          1: "раз в год",
          2: "2 раза в год (раз в полгода)",
          4: "4 раза в год (ежеквартально)",
          12: "12 раз в год (ежемесячно)",
        },
        en: {
          1: "once a year (annual)",
          2: "twice a year (semi-annual)",
          4: "4 times a year (quarterly)",
          12: "12 times a year (monthly)",
        },
      };
      const known = named[language][times];
      if (known) return known;
      if (times < 1) return language === "ru" ? `раз в ${days(periodDays)}` : `once every ${days(periodDays)}`;
      return language === "ru" ? `${times} ${pluralRu(times, "раз", "раза", "раз")} в год` : `${times} times a year`;
    },

    duration: (value) => {
      if (!value || value <= 0) return DASH;
      // Согласуем слово с тем числом, которое реально показываем: 1,2 года, 7 лет.
      const shownDays = Math.round(value);
      const shownYears = Math.round((value / 365.25) * 10) / 10;
      const daysText =
        language === "ru"
          ? `${loose(shownDays, 0)} ${pluralRu(shownDays, "день", "дня", "дней")}`
          : `${loose(shownDays, 0)} ${pluralEn(shownDays, "day", "days")}`;
      return `${daysText} (${years(shownYears, loose(shownYears, 1))})`;
    },

    listLevel: (level) => {
      if (level === null || level === undefined) return DASH;
      if (language === "ru") return level >= 1 && level <= 3 ? `${level}-й уровень листинга` : `уровень ${level}`;
      return level >= 1 && level <= 3 ? `Tier ${level} listing` : `Tier ${level}`;
    },
  };
}
