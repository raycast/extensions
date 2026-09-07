# Weather

A visually rich weather extension for Raycast, powered by the free [Open-Meteo](https://open-meteo.com) API (no API key required).

## Commands

- **Weather** — the main window, with three views (`⌘O` cycles, or pick directly from the Switch View action; your last choice is remembered):
  - **Forecast list** — current conditions plus 7 or 16 days ahead (`⌘D` to toggle), with a detail panel per day.
  - **Today** — a full-window glance: the hero scene, a rain nowcast when relevant, a strip of the next 10 hours, and the full stats sidebar.
  - **Radar** — animated precipitation radar (RainViewer) over an Esri basemap: a looping GIF of the past hour plus a 30-minute nowcast, with a timeline bar marking where forecast frames begin. The basemap follows your theme (dark or light). Zoom with `⌃⌥=` / `⌃⌥-`, pan with `⌃⌥` + arrow keys, and reset the view with `⌘⇧.`.
- **Weather in Menu Bar** — glanceable temperature and conditions in the menu bar, refreshed every 30 minutes, with a dropdown showing the nowcast, air quality, alerts, and the next hours.
- **Cast the Weather Fox** — the extension's mascot: an animated fox acting out your live weather in his tiny world, full-window. Every scene is pure SVG with native animation — rain falls, clouds drift, the chimney smokes, and Cast breathes, blinks, and gets up to a different activity per condition (kite flying in the wind, puddle jumping in the rain, apple picking on clear autumn days, a campfire on cold nights, cocoa on the porch during thunderstorms). He notices more than the sky: a rainbow when the sun comes out after rain, a phase-accurate moon, and smoky air keeps him indoors.
- **Easter eggs** — a few secret scenes are hidden around the extension. Cast knows some places that aren't on any map.

## Features

- **Dynamic hero panel** — a hand-drawn SVG scene that adapts to the conditions: gradient skies that shift with the weather and time of day, a glowing sun or phase-accurate moon with stars, puffy clouds, rain, snow, and lightning.
- **24-hour temperature curve** — a smooth chart with high/low annotations and a live "now" marker, rendered directly inside the detail view.
- **Rain nowcast** — 15-minute precipitation data answers "will it rain soon?" with a one-liner ("Rain starting around 20:30") and a bar chart in the Today view. Minute-level model data covers North America and Central Europe; elsewhere it's interpolated.
- **Current conditions** — temperature, feels-like, humidity, wind and gusts, pressure, cloud cover, UV index, sunrise and sunset, plus how today compares to yesterday.
- **Air quality & pollen** — US AQI with EPA color bands everywhere; grass, birch, and other pollen levels in Europe.
- **Severe weather alerts** — active National Weather Service warnings shown at the top of the list (US locations).
- **Moon detail** — real phase and illumination (the hero moon is drawn to match), moonrise and moonset.
- **7 or 16-day forecast** — one item per day with its own hero scene, hourly temperature curve, rain probability and amounts, UV, and wind. Search by day name or date ("friday", "aug 29").
- **Guided first launch** — a three-step wizard picks your city, units, and theme (with live day/night previews of each theme).
- **Multiple locations** — press `⌘L` to add places: cities, neighborhoods ("noe valley"), or postal codes ("94114"). Qualify ambiguous names with commas — "springfield, illinois" or "soho, london". With more than one saved, a dropdown appears in the list's search bar, and from any view (including Today and Radar) `⌘⇧]` jumps to the next city and `⌘⇧L` opens the full picker. Remove the current city anytime from the action panel.
- **Themes** — switch anytime with `⌘T`, no settings panel needed:
  - *Atmosphere* (default) — vivid skies that follow the weather and time of day.
  - *Synthwave* — retro neon purples and pinks, always starry.
  - *Noir* — moody monochrome.
  - *Paper* — warm light theme, ink on cream.
  - *Golden Hour* — perpetual sunset warmth.
  - *Terminal* — green phosphor CRT.
  - *Blueprint* — white line-work on cyanotype blue.
  - *Candy* — bubblegum pastel pop.
- **Units** — toggle °C/°F (and km/h/mph) instantly with `⌘U`.
- **Share actions** — every view has a Share section in the action panel:
  - *Copy Image* (`⌘⇧C`), *Paste Image* (`⌘⇧V`, drops it straight into the frontmost app), and *Save Image to Downloads* — a polished square retina PNG of the current conditions, any forecast day, or the radar snapshot with a stats footer. Also available from the menu bar dropdown. (macOS only — it uses the system QuickLook renderer.)
  - On the radar view: *Copy Animated GIF* (`⌘⇧G`), *Paste Animated GIF*, and *Save GIF to Downloads* — the looping radar animation itself, ready to drop into Slack.

## Setup

No account, API key, or preferences panel needed — everything is configured inside the command itself, starting with the first-launch wizard.

## Development

```bash
npm install
npm run dev
```

To preview the artwork without launching Raycast:

```bash
npx tsx scripts/preview.ts          # hero cards for every theme/condition → /tmp/weather-previews
npx tsx scripts/cast-preview.ts     # every Cast scene → /tmp/cast-previews
npx tsx scripts/cast-validate.ts    # checks the generated SVG animations for structural errors
```

`scripts/make-icon.ts` and `scripts/mask-icon.ts` regenerate the two icons in `assets/` (instructions in the file headers).
