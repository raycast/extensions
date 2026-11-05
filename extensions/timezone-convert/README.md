# Time Zone Convert

A Raycast extension for converting times between time zones the way you convert units: type a query, get the answer.

```
9am PST to CET
now in Tokyo
tomorrow 14:30 Europe/Rome to SF
2026-12-24 18:00 Europe/Rome to America/New_York
in 2 hours to NYC
9:30pm PST → IST
```

## What it understands

**Times:** `9am`, `9:30 am`, `21:00`, `noon`, `midnight`, `9 o'clock`, bare hours (`9`).

**Dates:** `today`, `tomorrow`, `yesterday`, weekdays (`monday`, `next friday`), `2026-11-05`,
`05/11/2026` (day first), `nov 5`, `5 november`.

**Relative:** `now`, `in 2 hours`, `2h ago`, `+90m`, `-1d`.

**Zones:** IANA ids (`Europe/Rome`), cities and countries (`rome`, `italy`, `nyc`, `sf`, `bangalore`),
abbreviations (`PST`, `CET`, `IST`, `JST`, `AEST`, …), fixed offsets (`UTC+2`, `GMT-5`, `-03:30`) and
`local` / `here`.

A unique prefix also works: `amster` finds Amsterdam.

Abbreviations are ambiguous by nature: `CST` means US Central (type `shanghai` for China Standard Time),
`IST` means India (type `dublin` for Irish Standard Time) and `BST` means British Summer Time.

## Using it

- **In the command:** open *Convert Time Zone* and type. With an empty search bar it shows your local
  time plus pinned zones.
- **From Raycast root search:** type the command name, press `Tab`, then type the query — the command
  takes an optional text argument.
- **Actions:** copy the time, the full conversion (`9:00 AM PST → 6:00 PM CET`), ISO 8601 or the Unix
  timestamp; swap zones; or open *Show All Zones* for a table of ~50 zones at that moment.

## Preferences

- **Pinned Zones** — comma-separated zones shown under every result and in the world clock
  (default `Europe/Rome,America/New_York,Asia/Tokyo`).
- **Time Format** — 24-hour or 12-hour. It can also be switched from the dropdown in the search bar.

## Development

```sh
npm install
npm run dev     # installs the extension in Raycast and watches for changes
npm run lint
npm run build
```

`node scripts/make-icon.mjs` regenerates `assets/extension-icon.png`.

Times and DST come from the platform's `Intl` time zone database, so there is no zone table to keep
up to date. Before publishing to the Raycast Store, make sure the `author` field in `package.json`
is your Raycast handle.
