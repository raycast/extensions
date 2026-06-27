# Raycast Fire TV

Cast YouTube and Stremio content to your Fire TV from Raycast, via Home Assistant. Automatically wakes your Fire TV and projector before casting.

## Commands

### Cast YouTube
Copy a YouTube link → Raycast → "Cast YouTube". Opens in SmartTube.

### Cast Stremio
Copy an IMDb ID (`tt1375666`) or type a movie/series name → Raycast → "Cast Stremio". Searches Stremio's Cinemeta API and opens the result.

## Setup

```bash
bun install
bun run dev
```

### Preferences

| Setting | Details |
|---------|---------|
| **Home Assistant URL** | Your HA instance (e.g. `https://ha.local`) |
| **Home Assistant Token** | Long-lived access token (HA → Security) |
| **Fire TV Entity** | `media_player` entity for your Fire TV |
| **Projector connected** | Check if you use a projector |
| **Projector Entity** | `media_player` entity (used to check on/off) |
| **Projector MAC Address** | For Wake-on-LAN magic packet |

## Requirements

- [Home Assistant](https://www.home-assistant.io/) with the [Android TV](https://www.home-assistant.io/integrations/androidtv/) integration for your Fire TV
- [SmartTube](https://smarttubeapp.github.io/) installed on Fire TV
- [Stremio](https://www.stremio.com/) installed on Fire TV
- Optional: projector with Wake-on-LAN support

## How it works

1. If projector is off → sends Wake-on-LAN magic packet → waits for warm-up
2. If Fire TV is off → sends POWER keyevent (triggers HDMI-CEC for projector fallback)
3. Launches content in SmartTube or Stremio
