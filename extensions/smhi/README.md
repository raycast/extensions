# SMHI Weather

Raycast weather forecasts from [SMHI](https://www.smhi.se/) − no API key required.

## Commands

- **Search Weather** − type a place name, get hourly + multi-day forecasts. ⌘D opens a detail pane: humidity, wind, gust, pressure, visibility, cloud cover by layer, precipitation probability/amount/type and more.

## How it works

- Place names are geocoded via [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/).
- Forecasts come from SMHI's point-forecast API: `category/snow1g/version/1` ([docs](https://opendata.smhi.se/metfcst/snow1gv1)). The previous `pmp3g/version/2` endpoint was shut down on 2026-03-31.
- Coverage is Sweden and parts of the Nordics. Coordinates outside the grid show an out-of-coverage notice.
- Forecasts are cached for 30 minutes per location.

## Tips

- Hourly rows read `15° (13°)`: air temperature, then what it feels like. The pair turns blue when either value drops below freezing, so wind chill is visible at a glance.
- ⌘D toggles the detail pane. Hourly rows show a metadata breakdown; coming days show an hour-by-hour interval table.
- Pin a forecast as a favorite with ⌘F. Rename it with ⌘E (give it "Home", "Work", "Cabin", …). Reorder with ⌘⇧↑/↓.
- Recent searches appear under Favorites, sorted by how often + how recently you've visited them. ⌘⇧⌫ resets a ranking, ⌃D forgets the place.
- ⌘R refreshes the current forecast on demand.

## Attribution

- Unofficial. Not affiliated with or endorsed by SMHI.
- Weather data © [SMHI](https://www.smhi.se/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Geocoding © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) via Nominatim, ODbL 1.0.
