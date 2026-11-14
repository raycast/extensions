import { Locale } from "date-fns";
import { de, enUS, es, fr, it, ja, ko, th, vi, zhCN, zhTW } from "date-fns/locale";

export interface LanguageConfig {
  /** Used when formatting the inserted date, e.g. for `EEE` or `MMMM`. */
  locale: Locale;
  /** Weekday header labels indexed by `getDay()` (0 = Sunday). Matches the Obsidian plugin. */
  weekdayLabels: string[];
  /** Header of the week-number column. */
  weekLabel: string;
  /** Title of the day calendar, e.g. "October 2026". */
  monthTitleFormat: string;
  /** Title of the month view, e.g. "2026". */
  yearTitleFormat: string;
  /** Cells of the month view, e.g. "Oct". */
  monthLabelFormat: string;
}

const LATIN_TITLES = { monthTitleFormat: "LLLL yyyy", yearTitleFormat: "yyyy", monthLabelFormat: "LLL" };
const CJK_TITLES = { monthTitleFormat: "yyyy年M月", yearTitleFormat: "yyyy年", monthLabelFormat: "M月" };

export const LANGUAGES = {
  de: { locale: de, weekdayLabels: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], weekLabel: "KW", ...LATIN_TITLES },
  en: { locale: enUS, weekdayLabels: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], weekLabel: "Wk", ...LATIN_TITLES },
  es: { locale: es, weekdayLabels: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"], weekLabel: "Sem", ...LATIN_TITLES },
  fr: { locale: fr, weekdayLabels: ["d", "l", "ma", "me", "j", "v", "s"], weekLabel: "Sem", ...LATIN_TITLES },
  it: { locale: it, weekdayLabels: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"], weekLabel: "Sett", ...LATIN_TITLES },
  ja: { locale: ja, weekdayLabels: ["日", "月", "火", "水", "木", "金", "土"], weekLabel: "週", ...CJK_TITLES },
  ko: {
    locale: ko,
    weekdayLabels: ["일", "월", "화", "수", "목", "금", "토"],
    weekLabel: "주",
    monthTitleFormat: "yyyy년 M월",
    yearTitleFormat: "yyyy년",
    monthLabelFormat: "M월",
  },
  th: { locale: th, weekdayLabels: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"], weekLabel: "สป.", ...LATIN_TITLES },
  vi: { locale: vi, weekdayLabels: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], weekLabel: "Tuần", ...LATIN_TITLES },
  "zh-CN": { locale: zhCN, weekdayLabels: ["日", "一", "二", "三", "四", "五", "六"], weekLabel: "周", ...CJK_TITLES },
  "zh-TW": { locale: zhTW, weekdayLabels: ["日", "一", "二", "三", "四", "五", "六"], weekLabel: "週", ...CJK_TITLES },
} satisfies Record<string, LanguageConfig>;

type LanguageCode = keyof typeof LANGUAGES;

export function languageConfig(code: string): LanguageConfig {
  return LANGUAGES[code as LanguageCode] ?? LANGUAGES.en;
}
