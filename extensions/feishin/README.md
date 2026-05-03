# Feishin

Control [Feishin](https://github.com/jeffvli/feishin) music player directly from Raycast via its built-in remote control server.

## Setup

### 1. Enable Remote Control in Feishin

Open Feishin → **Settings** → **Remote Control** and:

- Toggle **Enable Remote Control** on
- Set a **Port** (default: `4333`)
- Optionally set a **Username** and **Password**

### 2. Configure the Extension

Open Raycast → search any Feishin command → press **⌘ Enter** to open preferences, then fill in:

| Field | Description | Default |
|-------|-------------|---------|
| Host | Hostname or IP of the machine running Feishin | `localhost` |
| Port | Remote control port set in Feishin | `4333` |
| Username | Remote control username (leave empty if not set) | — |
| Password | Remote control password (leave empty if not set) | — |

### 3. (Optional) Navidrome Cover Art

If you use Feishin with a **Navidrome** server and want album art in the Now Playing view, fill in the Navidrome fields:

| Field | Description |
|-------|-------------|
| Navidrome URL | Your Navidrome server URL, e.g. `http://localhost:4533` |
| Navidrome Username | Your Navidrome account username |
| Navidrome Password | Your Navidrome account password |

Without these, album art falls back to Feishin's built-in image proxy.

## Commands

| Command | Description |
|---------|-------------|
| **Now Playing** | Full playback view with album art, metadata, and keyboard controls |
| **Toggle Play/Pause** | Toggle playback |
| **Next Track** | Skip to the next track |
| **Previous Track** | Go to the previous track |
| **Volume up** | Increase volume by 10% |
| **Volume Down** | Decrease volume by 10% |
| **Toggle Shuffle** | Toggle shuffle mode |
| **Set Repeat Mode** | Set repeat to Off, All, or One |
| **Toggle Favorite** | Toggle favorite status on the current song |

## Now Playing Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play / Pause | `↵ Enter` |
| Next Track | `Ctrl + →` |
| Previous Track | `Ctrl + ←` |
| Volume Up | `Ctrl + ↑` |
| Volume Down | `Ctrl + ↓` |
| Toggle Favorite | `Ctrl + L` |
| Toggle Shuffle | `Ctrl + S` |
| Cycle Repeat | `Ctrl + R` |
| Set Volume 0% | `Ctrl + Shift + 0` |
| Set Volume 50% | `Ctrl + Shift + 5` |
| Set Volume 100% | `Ctrl + Shift + 9` |
