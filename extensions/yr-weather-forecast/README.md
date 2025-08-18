## Yr Powered Weather Forecast

This is a [Raycast](https://www.raycast.com) extension for displaying weather forecasts from The Norwegian Institute of Meteorology (MET), with search, favorites, and detailed forecast views.

**Maintainer:** Kynd  
**Contact:** weather@kynd.no  
**Issues & Feedback:** [GitHub Issues](https://github.com/kynd/yr-weather-raycast/issues)

### API Compliance

This extension follows [MET API usage guidelines](https://developer.yr.no/doc/TermsOfService) including:

- Using a descriptive `User-Agent` with version, repository link, and contact email.
- Respecting caching rules to avoid unnecessary load on MET servers.
- Displaying MET as the data source in all relevant views.

### Privacy

This extension does not send any user data to our servers. All API requests are made directly from your device to MET and OpenStreetMap services.

### Features

- **Search locations**: Type a city/place to find coordinates (via OpenStreetMap Nominatim).
- **Favorites in main view**: Your saved places show:
  - Temperature and colored emoji weather icon
  - Wind speed, optional wind direction (arrow + cardinal)
  - Precipitation amount
  - Optional sunrise and sunset times
- **Add/Remove favorites**: From search results or the favorites list.
- **Forecast (combined view)**: Push to a detailed screen with:
  - SVG graph (temperature solid line + precipitation dotted line)
  - Weather emojis at each point, wind arrows on the bottom axis
  - 24-hour clock labels, axes reflect selected units
  - Forecast table grouped by day
- **Graph view**: Also available directly from a favorite.
- **Units**: Metric (default) or Imperial; respected in lists and graphs.
- **Caching**: Reduces API calls (MET: 30 minutes, Sunrise/Sunset: 6 hours).

### How to use

1. Open Raycast and run the command `Yr`.
2. Start typing to search for a location.
3. In search results:
   - Press Enter to show current weather (toast)
   - Add to favorites (Action: Add to Favorites)
4. In the favorites section:
   - Press Enter to open the combined Forecast screen
   - Use actions to open the Graph directly or remove from favorites

### Command preferences

- **Units**: Metric (°C, m/s, mm) or Imperial (°F, mph, in)
- **Show Wind Direction**: Toggle arrow + cardinal display in main view
- **Show Sunrise/Sunset**: Toggle sunrise/sunset accessories in main view

To change: open the `Yr` command → Cmd+K (or right arrow) → Configure Command.

### Graph details

- Temperature: solid red line; values and axis in °C/°F per preference
- Precipitation: dotted blue line; axis in mm/in per preference
- Weather: colored emoji above temperature points (e.g., ☀️, 🌧️, ⛈️, 🌨️, 🌫️, ☁️)
- Wind: arrows along the bottom axis (↑ N, ↗ NE, …)
- Time labels: 24‑hour clock

### Data sources

- **Weather & forecast**: MET Locationforecast 2.0 (`https://api.met.no/weatherapi/locationforecast/2.0/compact`)
- **Sunrise/Sunset**: MET Sunrise 3.0 (`https://api.met.no/weatherapi/sunrise/3.0/sun`)
- **Geocoding**: OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org`)

The extension sends a compliant User-Agent when calling external APIs.

### Caching

- Forecast and current weather: cached for 30 minutes per location
- Sunrise/Sunset: cached for 6 hours per location/day

### Develop

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### License

MIT
