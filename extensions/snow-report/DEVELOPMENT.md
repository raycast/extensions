# Developing Snow Report

```sh
npm install
npm run dev        # run in Raycast
npm run build
npm run typecheck
npm run lint
npm test           # unit tests (Node's test runner)
```

## Weather: Open-Meteo

Forecasts come from the [Open-Meteo forecast API](https://open-meteo.com/en/docs), which is free and needs no API key. Each resort is queried twice, once at its base elevation and once at its top. The `elevation` parameter drives Open-Meteo's statistical downscaling, so the two points get different temperatures and snowfall. Resorts without elevations get one point with `elevation=nan`.

- All points are batched into as few requests as possible, chunked to keep URLs under 2,000 characters.
- Requests use exactly 10 hourly variables and no daily ones: more than 10 counts as several calls against the free limit, so daily totals are computed from the hourly data.
- Forecasts are cached for 30 minutes in a cache shared by all commands. Bump `VERSION` in `src/hooks/useForecasts.ts` when the forecast shape changes.
- Only favorites, the selected resort and the rows around it (4 above, 12 below) are fetched. Cached forecasts show instantly while a fresh one loads.

Snow depth isn't shown: forecast models ignore elevation for it and disagree wildly between models. It's only used, with the past week's snowfall, to decide how much snow to draw on the mountain.

## Resorts: OpenSkiData

`src/data/resorts.json` is generated from [OpenSkiData](https://openskidata.org/)'s ski areas export, which is built daily from OpenStreetMap. It includes every named, operating ski area with downhill terrain, except indoor and grass slopes. OpenSkiData doesn't flag those, so `scripts/build-resorts.ts` matches them by name. Base and top elevations are the lowest and highest points of the mapped lifts and runs.

To refresh the list:

```sh
npm run build:resorts
```

This downloads `https://tiles.openskimap.org/csv/ski_areas.csv` into memory (the raw file is never saved), writes `src/data/resorts.json`, and prints a spot-check table of well-known resorts. To drop small hills, raise `MIN_VERTICAL_M` in `scripts/build-resorts.ts`.

## Tests and CI

Tests live in `test/`. `@raycast/api` only loads inside Raycast, so `test/support/` swaps in a small stub for it.

GitHub Actions runs build, type check, lint and tests on every pull request and push to `main` (`.github/workflows/ci.yml`).

## Releasing

1. Merge to `main` with CI passing.
2. Add a section at the top of `CHANGELOG.md`: `## [What changed] - {PR_MERGE_DATE}`.
3. Run `npm run publish`. It opens or updates a pull request on Raycast's extensions repository for review.

Store screenshots are in `metadata/`: 2000×1250 PNGs taken with Raycast's Window Capture (⌘⇧⌥M, Save to Metadata).
