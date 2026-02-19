# Ramadan

Suhoor & Iftar times, and a full Ramadan schedule — based on your location.

## Commands

- **Suhoor Time** — Shows today's Suhoor time with a countdown
- **Iftar Time** — Shows today's Iftar time with a countdown
- **Ramadan Schedule** — Full 30-day Ramadan calendar with Suhoor & Iftar times for each day
- **Menu Bar Countdown** — Live fasting countdown in your menu bar, updated every 10 minutes

## Setup

Before using the extension, configure the following preferences in Raycast Settings:

### Required

| Preference | Description | Example |
|------------|-------------|---------|
| City | Your city name | `London`, `Dubai`, `New York` |
| Country | Your country name | `UK`, `UAE`, `US` |

### Optional

| Preference | Description | Default |
|------------|-------------|---------|
| Calculation Method | Prayer time calculation method used by your local authority | ISNA |
| Hijri Date Offset | Adjust the Hijri date by ±days to match local moon sighting | `0` |
| Time Format | `12-hour`, `24-hour`, or `System Default` | System Default |

## Calculation Methods

The following prayer time calculation methods are supported:

- Islamic Society of North America (ISNA)
- Muslim World League (MWL)
- Egyptian General Authority
- Umm Al-Qura University, Makkah
- University of Islamic Sciences, Karachi
- Institute of Geophysics, University of Tehran
- Gulf Region
- Kuwait
- Qatar
- Singapore
- Turkey (Diyanet)
- Dubai
- Moonsighting Committee

## Data Source

Prayer times are fetched from the [Aladhan API](https://aladhan.com/prayer-times-api), a free and open Islamic prayer times service.
