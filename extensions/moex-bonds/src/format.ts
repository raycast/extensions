const DASH = "—";

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
export function plural(n: number, one: string, few: string, many: string): string {
  // Дробные всегда идут в родительном единственном: 1,2 года, 7,4 лет → «года».
  if (!Number.isInteger(n)) return few;
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Компактно: 2 знака, но без хвоста нулей у целых. */
export function fmtLoose(value: number | null | undefined, maxDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return value.toLocaleString("ru-RU", { maximumFractionDigits: maxDigits });
}

export function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return `${fmtNum(value, digits)} %`;
}

export function fmtSignedPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmtNum(value, digits)} %`;
}

export function fmtMoney(value: number | null | undefined, unit: string | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  const sign = currencySign(unit);
  return sign ? `${fmtLoose(value, digits)} ${sign}` : fmtLoose(value, digits);
}

export function fmtBigMoney(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  const sign = currencySign(unit);
  const abs = Math.abs(value);
  let text: string;
  if (abs >= 1e9) text = `${fmtLoose(value / 1e9, 2)} млрд`;
  else if (abs >= 1e6) text = `${fmtLoose(value / 1e6, 2)} млн`;
  else if (abs >= 1e3) text = `${fmtLoose(value / 1e3, 1)} тыс.`;
  else text = fmtLoose(value, 0);
  return sign ? `${text} ${sign}` : text;
}

/** «2041-05-15» → «15.05.2041». Мусор и «0000-00-00» отдаём как прочерк. */
export function fmtDate(iso: string | null | undefined): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return DASH;
  const [y, m, d] = parsed;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

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

/** «через 92 дня», «через 14 лет 8 мес.», «сегодня», «12 дней назад». */
export function fmtUntil(iso: string | null | undefined): string | null {
  const days = daysFromToday(iso);
  if (days === null) return null;
  if (days === 0) return "сегодня";
  const abs = Math.abs(days);
  const text = humanSpan(abs);
  return days > 0 ? `через ${text}` : `${text} назад`;
}

function humanSpan(days: number): string {
  if (days < 60) return `${days} ${plural(days, "день", "дня", "дней")}`;

  let years = Math.floor(days / 365.25);
  let months = Math.round((days - years * 365.25) / 30.44);
  // Округление вверх до 12 месяцев — это следующий год, а не «ноль месяцев».
  if (months >= 12) {
    years += 1;
    months = 0;
  }

  if (years === 0) return `${months} ${plural(months, "месяц", "месяца", "месяцев")}`;
  const yearsText = `${years} ${plural(years, "год", "года", "лет")}`;
  return months > 0 ? `${yearsText} ${months} мес.` : yearsText;
}

/** 182 дня → «2 раза в год (раз в полгода)». */
export function couponFrequency(periodDays: number | null | undefined): string | null {
  if (!periodDays || periodDays <= 0) return null;
  const times = Math.round(365 / periodDays);
  const named: Record<number, string> = {
    1: "раз в год",
    2: "2 раза в год (раз в полгода)",
    4: "4 раза в год (ежеквартально)",
    12: "12 раз в год (ежемесячно)",
  };
  if (named[times]) return named[times];
  if (times < 1) return `раз в ${periodDays} ${plural(periodDays, "день", "дня", "дней")}`;
  return `${times} ${plural(times, "раз", "раза", "раз")} в год`;
}

export function fmtDuration(days: number | null | undefined): string {
  if (!days || days <= 0) return DASH;
  // Согласуем слово с тем числом, которое реально показываем: 1,2 года, 7 лет.
  const shownDays = Math.round(days);
  const shownYears = Math.round((days / 365.25) * 10) / 10;
  const daysText = `${fmtLoose(shownDays, 0)} ${plural(shownDays, "день", "дня", "дней")}`;
  const yearsText = `${fmtLoose(shownYears, 1)} ${plural(shownYears, "год", "года", "лет")}`;
  return `${daysText} (${yearsText})`;
}

export function fmtListLevel(level: number | null | undefined): string {
  if (level === null || level === undefined) return DASH;
  if (level >= 1 && level <= 3) return `${level}-й уровень листинга`;
  return `уровень ${level}`;
}

export { DASH };
