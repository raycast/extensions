// specs/raycast/spec.md — shell presentation. Builds display-ready strings
// from core; no time math or offsets happen here.
import {
  DEFAULT_TIME_FORMAT,
  adjustForDistrict,
  bruneiNow,
  durationParts,
  formatDate,
  formatHijriDate,
  formatNumber,
  formatTime,
  formatWeekday,
  prayerProgress,
  type PrayerEntry,
  type PrayerName,
  type TimeFormat,
} from '../vendor/core.js'
import { PRAYER_LABELS } from './strings.js'
import { SHELL_LOCALE, type ExtensionSettings } from './settings.js'

export interface RowView {
  prayer: PrayerName
  label: string
  time: string
  current: boolean
  next: boolean
}

export interface DayView {
  weekday: string
  masihi: string
  hijri: string
  next: string
  nextPrayer: string
  soon: boolean
  currentPrayer: PrayerName | null
  rows: RowView[]
}

export interface DayInput {
  date: string
  entries: readonly PrayerEntry[]
  hijriDate: string
}

/** Renders one loaded day for the command list. */
export function buildDayView(
  day: DayInput,
  settings: ExtensionSettings,
  nowSeconds: number = bruneiNow().seconds,
): DayView {
  const locale = SHELL_LOCALE
  const format: TimeFormat = settings.timeFormat ?? DEFAULT_TIME_FORMAT
  const entries = adjustForDistrict(day.entries, settings.district)
  const progress = prayerProgress(entries, nowSeconds)
  const total = progress.secondsToNext
  const parts = durationParts(total)
  const n = (value: number) => formatNumber(value, locale)
  const duration =
    total < 60
      ? `${n(parts.seconds)}s`
      : parts.hours > 0
        ? `${n(parts.hours)}h ${n(parts.minutes)}m`
        : `${n(parts.minutes)}m`

  return {
    weekday: formatWeekday(day.date, locale),
    masihi: formatDate(day.date, locale),
    hijri: formatHijriDate(day.date, locale, day.hijriDate),
    next: `${duration} until ${PRAYER_LABELS[progress.next]}`,
    nextPrayer: progress.next,
    soon: total <= 15 * 60,
    currentPrayer: progress.current,
    rows: entries.map((entry) => ({
      prayer: entry.prayer,
      label: PRAYER_LABELS[entry.prayer],
      time: formatTime(entry.minutes, locale, format),
      current: entry.prayer === progress.current,
      next: entry.prayer === progress.next,
    })),
  }
}

/** The section title: weekday, both dates and the duration to next. */
export function dayTitle(view: DayView): string {
  return `${view.weekday} · ${view.masihi} · ${view.hijri} · ${view.next}`
}
