# Yr Weather Forecast

Norwegian weather data from MET, wrapped in a Raycast extension. Search locations, save favorites, get 9-day forecasts with graphs. No API keys, no fuss.

**Maintainer:** [Kynd](https://www.kynd.no) · weather@kynd.no · [Issues](https://github.com/kyndig/yr-wfc/issues)

## Quick Start

Search a location (3+ chars) → `Enter` to open forecast → `D` / `G` to flip between graph and data table → `Cmd+R` to refresh.

## Search

Uses OpenStreetMap Nominatim. Understands date tokens mixed with location names:

- **Weekday** — "Oslo fredag", "Oslo friday"
- **Next week** — "London next monday"
- **Day of month** — "Bergen 25" (within 9-day window)
- **Relative** — "Paris tomorrow", "Paris i morgen"

English and Norwegian (Bokmål). Diacritics normalized ("søndag" = "sondag").
For date-specific forecasts, graphs include context padding (last point before the selected day and first point after) to avoid abrupt edges.

## Keyboard Shortcuts

| Action                    | Shortcut            |
| ------------------------- | ------------------- |
| Open forecast             | `Enter`             |
| Graph ↔ Data table        | `D` / `G`           |
| 48-hour detailed forecast | `Cmd+4`             |
| 9-day summary forecast    | `Cmd+9`             |
| Add favorite              | `Cmd+F`             |
| Remove favorite           | `Cmd+Shift+F`       |
| Move favorite up / down   | `Cmd+Shift+↑` / `↓` |
| Refresh & clear cache     | `Cmd+R`             |
| Show welcome message      | `Cmd+Shift+W`       |
| Hide welcome message      | `Cmd+Shift+Alt+W`   |

## Preferences

Configure via `Yr` → `Cmd+K` → Configure Command. Options: units (metric/imperial), clock format (12h/24h), wind direction display, sunrise/sunset display, debug mode.

## Data Sources, Caching & Privacy

| Source                                                                        | Used for           |
| ----------------------------------------------------------------------------- | ------------------ |
| [MET Locationforecast 2.0](https://developer.yr.no/doc/locationforecast/2.0/) | Weather & forecast |
| [MET Sunrise 3.0](https://developer.yr.no/doc/sunrise/3.0/)                   | Sunrise/sunset     |
| [Nominatim](https://nominatim.org/)                                           | Geocoding          |

All APIs are public — no keys required.

**Cache TTLs:** forecast 30 min · sunrise 6 h · search 1 h · graphs 2 h. `Cmd+R` clears everything.

**Privacy:** all data stored locally, no tracking, no analytics. Search queries go to Nominatim without personal identifiers.

## License

MIT — see `package.json`.

---

**Made with 🫶 by [Kynd](https://www.kynd.no)**
