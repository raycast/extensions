# Downdetector

Instantly check if any service is down, directly from Raycast.

## Features

- **Search any service** — type a service name and get live status from Downdetector
- **24h report chart** — see the last 24 hours of incident reports with baseline reference
- **Report a problem** — submit an incident report without leaving Raycast
- **Search history** — recent services shown on launch for quick re-checking
- **Multi-region** — supports Global, France, UK, Germany, and Spain

## Usage

1. Open Raycast and run **Check Service Status**
2. Type at least 2 characters to search (e.g. `netflix`, `github`, `orange`)
3. Select a service to see its status and 24h chart
4. Use `⌘↵` to open in browser, or push **Report a Problem** to submit an incident

## Preferences

| Setting  | Description                         | Default       |
| -------- | ----------------------------------- | ------------- |
| Language | UI language (English / Français)    | English       |
| Region   | Downdetector regional site to query | Global (.com) |

## Notes

- Results are cached for 5 minutes to avoid rate limiting
- Uses macOS system `curl` for Cloudflare-compatible requests
- Chart data and status are scraped from the Downdetector page — not an official API
