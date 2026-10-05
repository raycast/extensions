# Stagehand

Control YouTube and other media playing in your browser without switching tabs or leaving your workflow.

## Features

- 🎵 **Play/Pause** - Toggle playback with a single command
- 📺 **Now Playing** - See all media playing across your browsers
- ⏩ **Skip Forward/Backward** - Jump 10 seconds in either direction
- 🔊 **Volume Control** - Adjust volume, mute/unmute
- 📋 **Copy URLs** - Copy video URLs with or without timestamps
- 🌐 **Multi-Browser Support** - Works with Chrome, Arc, Brave, and Safari

## Supported Browsers

- **Google Chrome** ✅
- **Arc** ✅
- **Brave** ✅
- **Safari** ✅

> **Note:** macOS only. Windows support planned for future releases.

All Chromium-based browsers use the same codebase, so adding support for Edge, Vivaldi, Opera, etc. is trivial.

## Commands

### 1. Play/Pause Media
Toggle play/pause for media currently playing in your browser.

**Recommended:** Assign a global hotkey (e.g., `⌥ + Space`) for instant control without opening Raycast.

### 2. Now Playing
View all YouTube videos currently playing across all your browsers. You can:
- See video titles and URLs
- See which browser each video is in
- Play/pause directly from the list
- Copy URL (with or without timestamp)
- Open the video in your browser

### 3. Skip Forward
Jump forward 10 seconds in the current video.

### 4. Skip Backward
Jump backward 10 seconds in the current video.

### 5. Volume Up
Increase volume by 10%.

### 6. Volume Down
Decrease volume by 10%.

### 7. Toggle Mute
Mute or unmute the video.

### 8. Copy URL
Copy the current YouTube video URL to your clipboard.

### 9. Copy URL at Current Time
Copy the YouTube video URL with a timestamp for the current playback position.

## Setup

### For Chrome, Brave, Arc (One-Time Setup)

These browsers require a security setting to allow AppleScript control:

1. Open your browser (Chrome/Brave/Arc)
2. Click **View** menu → **Developer** → **"Allow JavaScript from Apple Events"**
3. That's it! This is a one-time setting.

**Note:** Safari doesn't require this setup - it works out of the box!

## Usage Tips

1. **Set Global Hotkeys**: Go to Raycast Settings → Extensions → Stagehand and assign hotkeys to your most-used commands (especially Play/Pause). Recommended: `⌥ + Space` for Play/Pause.

2. **Background Playback**: Works even when the browser tab isn't focused or visible.

3. **Multiple Videos**: If multiple YouTube videos are playing, commands will control the most recently active one.

4. **Smart Video Detection**: Automatically detects when videos are ready to play, even after browser reloads or tab restoration.

5. **Browser Requirements**:
   - Browser must be running
   - At least one YouTube tab must be open with video
   - AppleScript JavaScript enabled (see Setup above for Chrome/Brave/Arc)

## Supported Sites

Currently supports:
- **YouTube** ✅

Coming soon:
- Spotify Web Player
- SoundCloud
- Twitch
- Vimeo
- Other video/audio sites

## Troubleshooting

**"No YouTube videos found"**
- Make sure YouTube is open and playing in a supported browser
- Check that the browser is actually running

**"Failed to control media" (Chrome/Brave/Arc)**
- Enable JavaScript from Apple Events: View → Developer → "Allow JavaScript from Apple Events"
- This is a one-time security setting

**Safari not responding**
- Safari should work without any setup. If it doesn't, try restarting Safari.

**Play/Pause not working after browser reload**
- After reloading browser tabs, YouTube videos may not be ready to play immediately
- Stagehand now detects when videos can't start playing and shows "Video not ready - play video in browser first" message
- **Solution**: Click the video once in your browser to start it, then Stagehand will work perfectly
- This is due to YouTube's autoplay policies, not a Stagehand limitation

## Privacy

This extension runs entirely locally on your Mac. No data is sent to external servers. It uses:
- AppleScript to communicate with browsers
- JavaScript injection to control video players

The "Allow JavaScript from Apple Events" permission only allows trusted AppleScript (like Raycast extensions) to control your browser. It does not expose your browser to web pages or external scripts.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Roadmap

- [ ] **Windows support** - Bring full functionality to Windows when Raycast Windows matures
- [ ] Support for more media sites (Spotify, Twitch, etc.)
- [ ] Playback speed control
- [ ] Quality control for YouTube
- [ ] Media notifications with album art
- [ ] History of played media
- [ ] Playlists/queue management

## License

MIT

## Credits

Created by Justin Lancaster

