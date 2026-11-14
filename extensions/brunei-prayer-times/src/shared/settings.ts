// specs/raycast/spec.md — command preferences resolved once per launch.
import {
  DEFAULT_DISTRICT,
  DEFAULT_TIME_FORMAT,
  isTimeFormat,
  resolveDistrict,
  type District,
  type TimeFormat,
} from '../vendor/core.js'

/** Raycast is US English only; the shell ships no locale preference. */
export const SHELL_LOCALE = 'en'

export interface CommandPreferences {
  timeFormat?: string
  district?: string
}

export interface ExtensionSettings {
  timeFormat: TimeFormat
  district: District
}

/** Resolves the raw Raycast preferences into settings; never throws. */
export function resolveSettings(value: unknown): ExtensionSettings {
  const stored = (value ?? {}) as CommandPreferences
  return {
    timeFormat: isTimeFormat(stored.timeFormat)
      ? stored.timeFormat
      : DEFAULT_TIME_FORMAT,
    district: resolveDistrict(stored.district ?? DEFAULT_DISTRICT),
  }
}
