# Prayer Times Changelog

## [Menu Bar Clears After the End] - 2026-10-27

- The menu bar clears once a prayer's time ends, instead of showing `Dhuhr ended`

## [Menu Bar Periods and Jamaat Formulas] - 2026-10-26

- Menu bar: the masjid disc shows the prayer's period (grey, dark green, light green, yellow, red) and the title says what it counts down to, e.g. `Dhuhr Pref. ends 8m`
- The dropdown names the current period, with the preferred end and end
- Before Preferred End (Minutes) setting, default 15
- Jamaat formulas: a Jamaat setting can be a formula such as `ceil(start, 15) + 15`, in the same language as the phone app, with a Jamaat Formula Guide command

## [Prayer Statuses, Calendar and Arabic Names] - 2026-10-25

- Mark a prayer Missed; an unmarked prayer counts as missed once its time ends, and late, made up (qaza) and missed have their own colors
- Every prayer has a start, a preferred end and an end; Hanafi Dhuhr is preferred until the one-shadow Asr
- Prayer Names setting: English or Arabic, replacing the free-text titles
- Prayer Calendar: one-page month with each day colored by most of its prayers, a day view with prayed times, and Save History to store past statuses
- Today's Prayers: times in fixed columns, the last 7 days and today as a table, and Enter opens a day's record
- Menu bar: the masjid on a colored disc that shows what it counts down to (start, jamaat, preferred end, end)
- Times always show as four-digit 24-hour times
- New icon

## [Initial Version] - 2026-10-24

- Offline prayer times (adhan) with calculation method, madhab, minute adjustments and Isha/Dhuhr end options
- Menu bar countdown to the next start, jamaat or end (`Asr -5`, `Asr (-40)`) with state-colored minaret and mosque icons
- Next Prayer root search subtitle, Today's Prayers list with 7-day stats
- Prayer Calendar: any month's prayer status, with a day view to mark, change and expand each prayer
- Prayer status: with jamaat, on time, late, made up or missed, kept in the reminder's notes (`prayer-status:` line)
- Jamaat rules: fixed time, offset, rounding, minutes before the prayer time ends, or Asr/Isha combined with Dhuhr/Maghrib
- Schools of fiqh (Hanafi, Shafi'i, Maliki, Hanbali, Ja'fari) with each prayer's valid and preferred end, an orange disliked-time state, and a Ja'fari calculation method
- Apple Reminders integration: timed reminders kept 14 days ahead with heads-up, start, jamaat and ending alarms
- Location from searchable country and city lists (GeoNames) or approximate current location, refreshed before each prayer
- Optional macOS banners and a Raycast popup with snooze
