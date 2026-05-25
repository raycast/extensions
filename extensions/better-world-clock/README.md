# Better World Clock for Raycast

A small Raycast extension that shows the current time for your favorite cities and time zones.

## Features

- Clean grid and compact list views
- Digital and analog clock cards
- 12-hour and 24-hour time
- Day/night indicators
- Add or remove time zones from Raycast's `⌘K` action panel
- Friendly city input, such as `San Francisco, New York, London, Tokyo`
- Advanced IANA time zone support, such as `Europe/London`

## Use it

1. Run `npm install`.
2. Run `npm run dev`.
3. Open Raycast and run **Better World Clock**.
4. Add **Better World Clock** to Raycast Favorites. If it is your third favorite, `⌘3` opens it directly.

## Configure time zones

Open Raycast Preferences → Extensions → Better World Clock and edit **Time Zones**.

Use city names separated by commas:

```text
San Francisco, New York, London, Tokyo
```

You can also put one city per line:

```text
San Francisco
New York
London
Tokyo
```

Advanced IANA IDs still work if you need a city that is not in the built-in friendly list:

```text
Paris (Europe/Paris)
Europe/Berlin
Singapore, Asia/Singapore
```

The time zone source is the IANA time zone database exposed by JavaScript's `Intl.DateTimeFormat` in Raycast's runtime. Use IANA IDs such as `America/New_York`, `Europe/London`, or `Asia/Tokyo`. Daylight saving time is handled automatically by `Intl` for the selected date and time zone.

## Display settings

Press `⌘K` inside Better World Clock to open actions. From there you can:

- Add a time zone (`⌘N`)
- Remove the selected time zone (`⌘⌫`)
- Switch between Grid and List
- Switch between 24-hour and 12-hour time
- Switch between Digital and Analog grid cards

You can also use Raycast Preferences → Extensions → Better World Clock to set defaults:

- **View**: Grid or List
- **Clock Style**: Digital or Analog for grid cards
- **Use 24-Hour Time**: 24-hour or 12-hour time
- **Show Seconds**: include or hide seconds

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Publish to the Raycast Store

Make sure you are signed in to Raycast, then run:

```bash
npm run publish
```

The Raycast CLI will validate the extension and guide you through the Store submission flow.
