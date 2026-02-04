# FlyCheck

Instantly look up aviation weather (METAR) for any airport with a 4-letter ICAO code. This extension provides real-time, decoded weather reports, making it easy for pilots, dispatchers, and aviation enthusiasts to quickly assess flight conditions.

![FlyCheck Demo](./media/flycheck-demo.gif)

## Features

- **Instant METAR Reports**: Get up-to-the-minute decoded METAR data from the CheckWX API.
- **Detailed Weather Breakdown**: View critical information at a glance, including:
  - Flight Category (VFR, MVFR, IFR, LIFR) with color-coded indicators.
  - Wind direction, speed, and gusts.
  - Visibility in miles.
  - Temperature and Dewpoint in °C and °F.
  - Barometric pressure in inHg and hPa.
- **Raw & Decoded Data**: Access both the original raw METAR string and a clean, decoded JSON format.
- **Effortless Actions**:
  - Copy raw METAR or decoded JSON to your clipboard.
  - Refresh data instantly with `⌘ R`.
- **Search History**: Quickly access your recently searched airports.
  - Remove entries from history with `⌘ D`.
- **Discover FlyCheck for macOS**: Includes a convenient link (`⌘ ⇧ D`) to download the full-featured FlyCheck menu bar application.

## Setup

1. Install this extension from the Raycast Store.
2. Get a free API key from CheckWX.
3. Open the extension's preferences (`⌘ ,`) and enter your API key.
4. Start searching by ICAO code (e.g., `KJFK`, `EGLL`, `WSSS`).

## About METAR

A METAR (METeorological Aerodrome Report) is a format for reporting weather information. It is a crucial tool for pilots to understand the current weather conditions at an airport. This extension decodes that report into a human-readable format.
