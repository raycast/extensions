# Kaset Raycast Extension

Control [Kaset](https://github.com/sozercan/kaset) - YouTube Music client for macOS - directly from Raycast.

## Features

- **Menu Bar Player** - Shows current track in macOS menu bar with full playback controls
- **Now Playing** - View current track with artwork, progress, and controls
- **Toggle Play/Pause** - Quick playback control
- **Next/Previous Track** - Skip tracks
- **Volume Control** - Set volume from 0-100%
- **Toggle Shuffle** - Enable/disable shuffle mode
- **Cycle Repeat** - Cycle through repeat modes (off → all → one)
- **Toggle Mute** - Mute/unmute audio
- **Like/Dislike** - Rate the current track

## Requirements

- [Kaset](https://github.com/sozercan/kaset) with AppleScript support
- macOS 14.0 or later

## Commands

| Command | Description |
|---------|-------------|
| Show Menu Bar | Show current track in menu bar with controls |
| Now Playing | View current track with artwork and controls |
| Toggle Play/Pause | Play or pause |
| Next Track | Skip to next |
| Previous Track | Go back |
| Set Volume | Choose volume level |
| Toggle Shuffle | Toggle shuffle mode |
| Cycle Repeat | Cycle repeat modes |
| Toggle Mute | Mute/unmute |
| Like Track | Like or unlike current track |
| Dislike Track | Dislike or remove dislike |

## Menu Bar

The menu bar player shows the current track and provides quick access to all controls:

- **Show**: Run "Show Menu Bar" from Raycast
- **Hide**: Click "Hide Menu Bar" in the menu bar dropdown

### Settings

Configure the menu bar display style in Raycast extension preferences:

- **Icon only** - Just the music icon
- **Short** - Track name truncated to 20 characters
- **Medium** - Track name truncated to 35 characters
- **Long** - Track name truncated to 50 characters

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint
npm run lint
npm run fix-lint
```

## License

MIT
