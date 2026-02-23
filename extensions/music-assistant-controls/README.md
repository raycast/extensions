# 🎵 Music Assistant Raycast Extension

Control [Music Assistant](https://github.com/music-assistant/server) from anywhere on macOS and keep the current track in your Raycast menu bar.

---

## Features

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| **Toggle**            | Pauses/resumes playback on the selected player                     |
| **Next Song**         | Skips to the next track                                            |
| **Volume Up**         | Increases volume on the active player                              |
| **Volume Down**       | Decreases volume on the active player                              |
| **Set Volume**        | Sets volume level (0-100) for the active player                    |
| **Menu Bar Player**   | Displays title - artist in the macOS menu bar with volume controls |
| **Set Active Player** | Chooses what player to run other commands on                       |

Works with:

- A standalone Music Assistant server
- The Home Assistant add-on

## Configuration

| Parameter | Description                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| `host`    | Local Music Assistant IP address and port (use the direct IP; mDNS is not reliable in the Raycast environment) |
| `token`   | Long-lived Music Assistant access token (Settings > Users > Tokens). Required for the authenticated API.       |

How to create a token:

1. Open Music Assistant in your browser.
2. Go to Settings > Users > Tokens.
3. Generate a new long-lived token and paste it into the Raycast preference.
