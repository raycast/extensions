// specs/raycast/spec.md — the shell's interface text. Raycast is US English
// only and its guidelines forbid custom localization, so these strings are
// literal English rather than lookups into the web catalogues. Domain values
// (PrayerName, District) stay identifiers; only their display labels live here.
import type { District, PrayerName } from '../vendor/core.js'

export const UI = {
  district: 'District',
  reload: 'Reload data',
  openApp: 'Open app',
  source: 'Data source',
  sourceName: 'Department of Islamic Affairs (KHEU), Brunei',
  settings: 'Settings',
  loading: 'Loading…',
  unavailable: 'Prayer times are unavailable.',
  refreshing: 'Updating…',
  refreshFailed: 'Could not reload. Try again.',
  retry: 'Try again',
  next: 'Next',
  now: 'Now',
  offline: 'You are offline. Showing the last known data.',
} as const

export const PRAYER_LABELS: Record<PrayerName, string> = {
  imsak: 'Imsak',
  subuh: 'Subuh',
  syuruk: 'Syuruk',
  doha: 'Dhuha',
  zuhur: 'Zuhur',
  asar: 'Asar',
  maghrib: 'Maghrib',
  isyak: 'Isyak',
}

export const DISTRICT_LABELS: Record<District, string> = {
  bruneiMuara: 'Brunei & Muara',
  tutong: 'Tutong',
  belait: 'Belait',
}
