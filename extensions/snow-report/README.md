# Snow Report

Snow forecasts for about 4,700 ski resorts worldwide, with the **base and summit side by side**.

## Commands

### Search Resorts

Search by resort, region or country. With nothing typed, you see your favorites, then a list of popular resorts.

Each resort shows:

- **Snowfall** at the base and summit: the past 24 hours and 7 days, and the next 24 hours, 72 hours and 7 days. Base and summit are never averaged.
- **The mountain right now**: sun or moon, cloud, fog in low visibility, falling snow or rain, and wind streaks in high wind. A **Fresh powder** badge appears after 10 cm or more in 24 hours.
- **Conditions**: temperature, wind and gusts (flagged red in high wind), and the freezing level.
- **A 7-day outlook** with daily snowfall and temperatures.

From the actions (⌘K) you can favorite a resort (⌘.), open its website, search for webcams, refresh the forecast (⌘R) and correct its elevations (⌘E).

### Favorites in Menu Bar

Shows your first favorite's summit snowfall for the next 24 hours, refreshed every 30 minutes. The dropdown lists all your favorites; click one to open it. To change which resort is in the menu bar, use **Show in Menu Bar** on a favorite in Search Resorts.

### Add Resort

Add somewhere that isn't listed, by name, coordinates and base and top elevation. Edit or delete it later from Search Resorts (⌘E).

## Settings

**Units**: metric (cm, °C, m, km/h) or imperial (in, °F, ft, mph).

## Good to know

- **Forecasts are from weather models**, not reports from the resorts. Snow depth isn't shown, because models can't estimate it reliably for a ski slope. The past week's snowfall is shown instead.
- **Base and top elevations** come from the resort's mapped lifts and runs. If they look wrong, correct them with **Edit Elevations** (⌘E). About 400 resorts have no lifts mapped, so they show a single forecast until you add elevations.
- **Indoor and grass slopes aren't included**, since there's no weather to forecast.

## Attribution

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0)
- Resort data from [OpenSkiData](https://openskidata.org/) / [OpenSkiMap.org](https://openskimap.org/), © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), [Skimap.org](https://skimap.org/), [Who's On First](https://whosonfirst.org/), © [Mapterhorn](https://mapterhorn.com/attribution)

The extension's code is MIT licensed. The resort list in `src/data/resorts.json` is a derived database of OpenSkiData and is available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/): if you share a modified version of it, share it under the same license.
