# Spirii Go

Find nearby [Spirii Go](https://spirii.dk) EV charging locations, check availability, and view current and upcoming prices for individual chargepoints — directly from Raycast.

## Commands

- **Nearby Chargers** — Lists Spirii Go locations sorted by distance, with live availability and power.
- **My Chargepoint** — Shows the live status and price schedule for a saved chargepoint ID.

## Setup

### Prerequisites

To find nearby chargers, the extension needs to know your location. Pick one of:

- **macOS GPS (recommended)** — install [`CoreLocationCLI`](https://github.com/fulldecent/corelocationcli):

  ```sh
  brew install corelocationcli
  ```

  The first time it runs, macOS will ask Raycast for Location Services permission. Approve it, or enable it manually in **System Settings → Privacy & Security → Location Services → Raycast**.

- **Manual override** — set `Latitude` and `Longitude` in the extension preferences (useful if you don't want to install anything, or want to browse chargers in a different area).

If neither is configured, the extension will prompt you — it won't fall back to a default location. No location data leaves your machine; only the Spirii API is contacted.

### Install

1. Install the extension from the Raycast Store (or clone this repo and run `npm install && npm run dev`).
2. Set up location as described above.
3. (Optional) Open the extension preferences and fill in **My Chargepoint ID** (e.g. `DK.SPI.Z000000*1`) to use the **My Chargepoint** command for quick status and price lookups.

## Preferences

| Name | Description |
| --- | --- |
| My Chargepoint ID | Used by the "My Chargepoint" command (e.g. `DK.SPI.Z000000*1`). |
| Price Granularity | Hourly average or raw 15-minute buckets for the schedule. |
| Latitude / Longitude | Optional manual overrides for location. |

## Data source

This is an unofficial, community-built extension. It is not affiliated with, endorsed by, or supported by Spirii. Data comes from the public `app.spirii.dk` endpoints used by their web/mobile apps, which may change or stop working at any time.
