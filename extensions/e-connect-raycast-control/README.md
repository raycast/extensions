# E-Connect Raycast Extension

This folder contains a standalone Raycast extension for controlling the local `E-Connect` stack from Raycast.

It talks directly to the backend API on the self-hosted server. It does not scrape or depend on the Web UI to load data.

The API key used by this extension is a server-side credential:

- stored in the backend database
- validated by the backend authentication path
- issued by the backend `POST /api/v1/api-keys` endpoint

The Web UI settings page is only one client for managing that server-side key.

## What It Does

- Shows `E-Connect` server health and alert counts.
- Lists approved devices with quick power controls for `OUTPUT` and `PWM` pins.
- Lists saved automations and lets you run or stop them from Raycast.
- Opens the main `E-Connect` Web UI in the browser.

## Required Setup

1. Provision a server-side API key for the account you want Raycast to use.
   The repository exposes `POST /api/v1/api-keys` for this, and the current Settings page is just one management surface for that endpoint.
   Use an admin-owned key if you want the dashboard command to read server health and alert data.
2. The first time a user opens any Raycast command, Raycast will prompt for the required preferences.
   Fill in:
   - `Server IP:Port`
   - `API Key`
   - `Allow self-signed certificates` only if your API connection uses HTTPS with a locally issued cert

The extension talks directly to the backend with:

- Preferred API base from `docs/API_KEYS.md`: `http://<server-ip>:8000/api/v1`
- Optional API base: `https://<server-ip>:3443/api/v1` if you intentionally expose the backend API over TLS
- Auth header: `Authorization: Bearer <api_key>`
- Optional browser shortcut inferred automatically: `https://<server-ip>:3443`

Accepted `Server IP:Port` input examples:

- `192.168.1.25:8000`
- `econnect.local:8000`
- `http://192.168.1.25:8000`
- `http://192.168.1.25:8000/api/v1`
- `https://192.168.1.25:3443`

This keeps two paths separate:

- direct server API access for Raycast commands
- optional HTTPS browser opening for manual UI flows

## Commands

- `Dashboard`: server status, MQTT/database health, fleet counts, and alerts
- `Devices`: device list plus quick on/off and brightness presets
- `Automations`: run or stop saved automation graphs
- `Open Web UI`: open the `E-Connect` browser interface

## Local Development

```bash
cd "Raycast extensions"
npm install
npm run dev
```

Raycast's current docs say extension development needs:

- Raycast `1.26.0+`
- Node.js `22.14+`
- npm `7+`

Reference docs used for this scaffold:

- https://developers.raycast.com/basics/getting-started
- https://developers.raycast.com/information/file-structure
- https://developers.raycast.com/information/manifest
- https://developers.raycast.com/api-reference/preferences

## Publishing Note

The `author` field in `package.json` must be a real Raycast Store handle. This scaffold uses `thomas` as a placeholder so Raycast validation passes locally.

# raycast_extensions
