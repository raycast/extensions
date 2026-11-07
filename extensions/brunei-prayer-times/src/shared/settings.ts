// specs/raycast/spec.md — command preferences resolved once per launch.
import {
  DEFAULT_DISTRICT,
  DEFAULT_TIME_FORMAT,
  isTimeFormat,
  resolveDistrict,
  type District,
  type TimeFormat,
} from '../vendor/core.js'
import { isLocale, type Locale } from './i18n.js'

/** Malay is the app default; the Store build swaps this to English. */
export const DEFAULT_LOCALE: Locale = 'en'

export interface CommandPreferences {
  locale?: string
  timeFormat?: string
  district?: string
}

export interface ExtensionSettings {
  locale: Locale
  timeFormat: TimeFormat
  district: District
}

/** Resolves the raw Raycast preferences into settings; never throws. */
export function resolveSettings(value: unknown): ExtensionSettings {
  const stored = (value ?? {}) as CommandPreferences
  return {
    locale: isLocale(stored.locale) ? stored.locale : DEFAULT_LOCALE,
    timeFormat: isTimeFormat(stored.timeFormat)
      ? stored.timeFormat
      : DEFAULT_TIME_FORMAT,
    district: resolveDistrict(stored.district ?? DEFAULT_DISTRICT),
  }
}
