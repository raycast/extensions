# AudioCast Controller

Control your LinkPlay (AudioCast / WiiM) device from Raycast.

## Features

### Device Overview

See device status at a glance — playback state, current track with cover art, volume level, Wi‑Fi signal strength, and connected network.

### Playback Control

- **Toggle play/pause** and **stop** playback
- **Volume** — set a specific level, increase/decrease in 5% steps, or use preset levels (minimal/normal/high)
- **Toggle mute/unmute**
- **Reboot** the device

### Radio Stations

- Manage a personal list of favorite radio stations
- Play a station directly on the device with one click
- **ICY metadata** — view the currently playing song and artist from the stream
- The currently playing station is highlighted with a ♪ symbol

### Album Art

- Radio tracks are matched against iTunes API for cover art and release info
- Spotify playback displays track info via UPnP

### Tested Devices

- AudioCast M5
- AudioCast Olio

---

## Limitations

- **Single device only** — the first device discovered on the network will be controlled. Multi‑device setups are not yet supported.

---

## How It Works

### Device Discovery

The extension uses **mDNS** to discover LinkPlay devices on the local network. The device advertises itself with service type `_linkplay._tcp`.

### Connection Security

LinkPlay devices use **HTTPS with mutual TLS (mTLS)** authentication. The extension:

- Authenticates with a client certificate and private key (extracted from the Android APK)
- Validates the device certificate (auto‑fetched during discovery)
- Only applies mTLS to device connections — external API calls (iTunes, etc.) use standard TLS

The client certificate (`assets/link_play_cert.pem`) and key (`assets/link_play_key.pem`) were extracted from the Android app bundle. These are manufacturer-issued protocol credentials shared across all LinkPlay clients (not user-specific secrets) — an accepted trade-off required for mTLS device authentication.

### LinkPlay API

The device exposes two APIs:

**HTTP API** (`/httpapi.asp`) — simple key‑value over HTTP:

- `getStatusEx` / `getStatus` — device info, firmware, SSID, signal strength
- `getPlayerStatus` — playback state, volume, mute, mode (radio/Spotify/etc.), title/artist/album
- `setPlayerCmd:play:<url>` — start playback of a URL
- `setPlayerCmd:pause` / `resume` / `stop` / `onepause` — playback control
- `setPlayerCmd:vol:<0‑100>` — set volume
- `setPlayerCmd:mute:<0|1>` — mute/unmute
- `reboot` — restart the device

**UPnP** (SOAP over HTTP on the mDNS port, e.g. `http://<host>:59152/upnp/control/rendertransport1`):

- `AVTransport:GetInfoEx` — combined transport state, track metadata, volume, mute, alarm status
  Used for Spotify playback info and other services that populate DIDL metadata.
