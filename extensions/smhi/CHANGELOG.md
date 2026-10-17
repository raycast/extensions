# SMHI Weather Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search any place in Sweden and the Nordics − geocoded via OpenStreetMap Nominatim, no API key required.
- Hour-by-hour for the rest of today and a high/low summary for each of the coming days. Hours that have already passed are dropped from a cached forecast.
- Detail pane (⌘D) with humidity, gust, pressure, visibility, cloud cover by layer, precipitation amount + probability + type, frozen share, and thunderstorm probability. Hourly rows render as metadata; coming days keep an hour-by-hour interval table.
- Apparent ("feels like") temperature computed client-side via the Australian BoM formula. Every hourly row shows it in parentheses after the air temperature, as "15° (13°)", and the detail pane spells it out. The pair collapses to one value when both round the same.
- Sub-zero temperatures read blue, warm ones orange or red; everything in between stays neutral.
- SMHI public weather warnings ("varningar") at the top of the forecast, filtered to your point via per-warning GeoJSON polygons. Color-coded by level (Red / Orange / Yellow / Message).
- Favorites with custom names (⌘F to pin, ⌘E to rename, ⌘⇧↑/↓ to reorder).
- Recent searches sorted by frecency, with ⌘⇧⌫ to reset a ranking and ⌃D to forget a place.
- Manual refresh on ⌘R; forecast and warnings are otherwise cached for 30 minutes per location.
- Detected and warned when the requested point falls outside SMHI's Nordic grid coverage.
