# Area Code Search

Status: standalone Raycast extension with bundled data. It does not depend on
Launch, Salesforce, or any API key.

Search US area codes by code, city, or state. Find which cities use an area code, see timezones and local time, and copy results with one action.

For shared setup, validation, and build commands, see `../README.md`.

## Features

- **Search by area code** – Type digits (e.g. `206`, `212`) to see all cities in that area code
- **Search by city or state** – Type a city name (e.g. `Seattle`) or state (e.g. `Washington`) to find area codes
- **Grouped results** – Cities are grouped by area code so overlays and multi-city area codes are easy to scan
- **Timezone and time** – Each city row shows a timezone label (ET, CT, MT, PT, etc.) and current local time
- **Quick copy** – Copy the area code, the city/state location, or both in one format: `area code — city, state`

## Requirements

- [Raycast](https://raycast.com) (macOS)
- No API keys or account required; data is bundled with the extension

## Installation

1. Open the [Raycast Store](https://www.raycast.com/store) and search for "Area Code Search"
2. Click **Install** (or install from the repo and run `npm run dev` for development)

## Usage

1. Open Raycast and run **Search Area Codes** (or assign a hotkey)
2. Type an area code (`206`), a city (`Seattle`), or a state (`Washington`)
3. Browse the grouped results; use the action panel to copy area code, location, or both

## Author

**mjking**

## License

MIT
