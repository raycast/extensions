# Next Luas

Live tram times for Dublin's Luas. Finds your closest stop via GPS and shows inbound and outbound forecasts in real time.

Powered by [Transport Infrastructure Ireland's](https://luasforecasts.rpa.ie/) free public feed. No API keys, no accounts.

## Setup

For precise location (recommended), install CoreLocationCLI:

```
brew install corelocationcli
```

The first time the command runs, macOS will prompt to grant Raycast access to Location Services. Click **Allow**. If you miss the prompt, enable it in **System Settings → Privacy & Security → Location Services → Raycast**.

Without CoreLocationCLI, the extension falls back to IP geolocation (less accurate) and shows a one-time toast explaining how to upgrade.

## Usage

Open Raycast and run **Next Luas**. You'll see:

- **Closest Stop** — name, line (Red / Green), distance, and location source (GPS / IP / Manual).
- **Inbound** / **Outbound** — one item per tram with due minutes and destination. `DUE` means the tram is at the platform.
- **Service Message** — shown only when the line is not operating normally.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘R` | Refresh location and forecast |
| `⌘S` | Cycle to next-nearest stop (top 3) |
| `⌘⇧C` | Copy "Next tram to {destination}: {mins}" |

Forecasts auto-refresh every 20 seconds while the view is open. Location re-resolves every 60 seconds so the closest-stop ranking follows you as you walk.

## Preferences

- **Manual Latitude / Longitude** — pin the extension to a fixed address (home, office). Overrides GPS and IP.

## Privacy

- Location: resolved locally on your Mac via CoreLocationCLI. Never leaves the machine except to compute distances against the bundled stops list.
- Network requests go to two hosts only:
  - `luasforecasts.rpa.ie` — TII's stops list and live forecasts.
  - `ipapi.co` — only used as a fallback when CoreLocationCLI is unavailable.

## Troubleshooting

- **"Using IP-based fallback" toast won't go away** — grant location permission to Raycast (see Setup), then run `⌘R` to clear the cache.
- **CoreLocationCLI returns nothing** — try `CoreLocationCLI -verbose` in Terminal to see the underlying error. Toggling Location Services off/on in System Settings usually fixes it.
- **Still wrong stop** — set Manual Latitude / Longitude in preferences.
