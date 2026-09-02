# KuandoHUB for Raycast

Control a [Kuando Busylight](https://www.plenom.com) from Raycast through the kuandoHUB HTTP API.

## Commands

| Command | Effect |
| --- | --- |
| **Set Busy** | Light red (`action=light&red=100`) |
| **Set Available** | Light green (`action=light&green=100`) |
| **Turn Off Light** | Light off (`action=off`) |

Each command fires a single GET request to the local kuandoHUB HTTP server and shows a HUD confirmation. No background process — the commands run on demand and exit.

## Requirements

1. **kuandoHUB app** installed and running (consider adding it to System Settings → General → Login Items so the light works after a reboot).
2. **HTTP Server enabled**: kuandoHUB → Advanced Settings → toggle *HTTP Server* on (default URL `http://localhost:8989`).
3. **HTTP source enabled** in kuandoHUB → Platform Priorities, positioned above/below other sources (MS Teams, Manual Controls, …) depending on which should win.

## Install

```sh
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast; you can stop it afterwards — the extension stays installed. Optionally assign hotkeys or aliases in Raycast → Settings → Extensions → KuandoHUB.

## Preferences

- **kuandoHUB URL** — base URL of the HTTP server. Default `http://localhost:8989`.
- **HTTP Server Access Token** — only needed when targeting a remote machine; localhost requests need no token. Sent as the `http_token` header.

## kuandoHUB HTTP API notes

From the kuandoHUB manual (v2.0.0), appendix 7. Color values are 0–100.

```
http://localhost:8989?action=light&red=100&green=0&blue=0
http://localhost:8989?action=off
http://localhost:8989?action=currentpresence   # running priority as JSON
http://localhost:8989?action=busylightdevices  # connected devices
```

Other actions: `alert`, `blink`, `jingle`, `pulse`, `colorwithflash`, `kuandoTimer`.

## Development

Source layout:

- `src/kuando.ts` — shared request/HUD/error handling
- `src/set-busy.ts`, `src/set-available.ts`, `src/turn-off.ts` — one file per command
- `assets/` — orb icons (red/green/grey), generated programmatically

Build check: `npx ray build -e dist`.
