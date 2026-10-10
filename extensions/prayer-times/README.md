# Prayer Times

Raycast extension that shows the next prayer in the menu bar and root search, keeps timed prayer
reminders in Apple Reminders, and tracks which prayers were prayed on time.

## Features

- **Menu bar countdown**: `Asr -5` (until start), `Asr +12` (since start), mosque icon `Asr -5`
  (until jamaat), `Asr (-5)` in red (time left). Icon color shows the state. The dropdown lists every
  prayer plus sunrise, midnight and tahajjud, color-coded as prayed, prayed late, current or missed.
- **Next Prayer** command: live root-search subtitle. Add it to Favorites to keep it on top.
- **Today's Prayers**: mark as prayed (on time or late is decided by the clock), override either way,
  and see the last 7 days.
- **Apple Reminders**: one timed reminder per prayer, kept 14 days ahead, with heads-up, start,
  jamaat and ending alarms, so alerts fire even when Raycast isn't running.
- **Jamaat rules** per prayer: `13:30`, `+10`, `floor5+15`, `ceil5+10`, `end-30`, plus a Jumu'ah rule.
- **Location**: pick a country and city, or use your approximate current location, refreshed 30
  minutes before each prayer.

## Setup

1. Run **Set Prayer Location**.
2. Run **Prayer Menu Bar** once to show it in the menu bar.
3. Allow Reminders access when asked (or turn Apple Reminders off in preferences).

### Current location

macOS only asks for location on behalf of an app, so the first time you choose **Use Current
Location** the extension builds a small helper app, **Prayer Times Location**, in its own support
folder from the extension's Swift code and asks macOS for permission. Allow it when prompted; you
can change this later in System Settings → Privacy & Security → Location Services.

It asks macOS for an approximate location only (a few kilometers, enough for prayer times, which
move by seconds over that distance) and keeps coordinates rounded to about 1 km. Nothing is
downloaded and no other app is needed.

## Development

```bash
npm install
npm run dev      # ray develop; also builds swift/PrayerTimes through Raycast's Swift bridge
npm test         # unit tests (TZ=Asia/Karachi)
```

`swift/PrayerTimes` holds the EventKit (Reminders) and CoreLocation code, called from
`src/lib/helper.ts` through `swift:` imports. Raycast compiles it with Xcode.

## Credits

- Prayer time calculation: [adhan-js](https://github.com/batoulapps/adhan-js) (MIT)
- City list: [GeoNames](https://www.geonames.org/) cities with 5,000+ people (CC BY 4.0)
