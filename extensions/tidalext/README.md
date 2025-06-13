# Tidal for Raycast

Control your Tidal web player directly from Raycast with real-time track information and playback controls.

## What it does

- Shows currently playing track in menu bar
- Control playback (play/pause, skip, previous)
- Ttoggle shuffle/repeat
- Like/heart tracks
- Quick keyboard shortcuts for playback

## Setup

### 1. Install Chrome Extension

1. Download `chrome-extension.zip` from our [Github Page](https://github.com/Ek2100/tidal/releases)
2. Unzip the file
3. Go to `chrome://extensions/` in your browser
4. Enable "Developer mode"
5. Click "Load unpacked" and select the unzipped folder

### 2. Set Authentication Token

**In Raycast:**
1. Open Raycast Preferences (`⌘,`)
2. Go to **Extensions** → **Tidal**
3. Set a **Local API Auth Token** (create a strong password)

**In Chrome Extension:**
1. Click the Tidal extension in your browser
2. Enter the **exact same token** you used in Raycast
3. Click **Save Token**

### 3. Start Using

1. Run **Start Server** command in Raycast
2. Go to [listen.tidal.com](https://listen.tidal.com) and play music
3. The menu bar will show your current track

## Quick Shortcuts

When the Tidal menu is open, use these keys:
- **Q**: Previous track
- **W**: Play/Pause  
- **E**: Next track
- **R**: Like track
- **T**: Shuffle
- **Y**: Repeat

## Troubleshooting

**Not working?**
1. Use **Server Status** command to check connection
2. Try **Stop Server** then **Start Server**
3. Refresh your Tidal tab (`⌘R`)

**Still stuck?** Open an issue on [GitHub](https://github.com/Ek2100/tidal/issues)

## Requirements

- Tidal subscription
- Chrome/Edge browser
- Must use Tidal web player (not desktop app)

---

*Made for Tidal and Raycast users • Not affiliated with Tidal or Raycast*
