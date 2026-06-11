# 🎵 Music Assistant Raycast Extension

Control [Music Assistant](https://github.com/music-assistant/server) from anywhere, and keep the current track in your Raycast menu bar.

---

## Features

| Command                  | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Toggle Play**          | Play or pause the current track on the selected player                                  |
| **Next Song**            | Skip to the next track                                                                  |
| **Previous Song**        | Go back to the previous track                                                           |
| **Volume Up**            | Increase volume on the selected player                                                  |
| **Volume Down**          | Decrease volume on the selected player                                                  |
| **Toggle Mute**          | Mute or unmute the selected player                                                      |
| **Set Volume**           | Set volume to a specific level (0-100)                                                  |
| **Set Active Player**    | Choose which player to control with commands                                            |
| **Menu Bar Player**      | Display the current track in the menu bar with playback, grouping and volume controls ⓘ |
| **Current Track**        | View the now-playing track with album art and quick actions                             |
| **Music Library Hub**    | Search, browse, and manage your Music Assistant library                                 |
| **Manage Player Groups** | Create and manage player groups for synchronized playback                               |

**ⓘ Platform Notes:** The Menu Bar Player command is available on macOS only. All other commands work on both macOS and Windows.

## Configuration

| Setting          | Description                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Host**         | Local Music Assistant IP address and port (e.g., `http://192.168.0.166:8095`). Use the IP address directly, not mDNS. |
| **Access Token** | Long-lived Music Assistant access token for authentication.                                                           |

### How to set up

1. Open Music Assistant in your browser
2. Go to **Settings > Users > Tokens**
3. Create a new long-lived token and copy it
4. In Raycast preferences, paste the token and enter your Music Assistant host URL
5. Run **Set Active Player** to choose which speaker to control

Works with:

- Standalone Music Assistant server
- Home Assistant Music Assistant add-on
