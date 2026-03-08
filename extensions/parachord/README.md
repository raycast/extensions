# Parachord Raycast Extension

Control Parachord music player directly from Raycast.

## Features

- **Play/Pause** - Toggle playback with a single command
- **Next/Previous** - Skip tracks quickly
- **Search & Play** - Search for music and play instantly
- **Add to Queue** - Queue up tracks without interrupting playback
- **AI DJ Chat** - Send prompts to the AI DJ for recommendations
- **Volume Control** - Adjust volume from Raycast
- **Shuffle Toggle** - Turn shuffle on/off
- **Open Artist** - Jump directly to an artist page

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   cd raycast-extension
   npm install
   ```
3. Import into Raycast:
   - Open Raycast
   - Go to Extensions
   - Click "+" and select "Import Extension"
   - Navigate to this folder

### Development

```bash
npm run dev
```

## Commands

| Command | Description | Shortcut Suggestion |
|---------|-------------|---------------------|
| Play/Pause | Toggle playback | `⌘ ⇧ P` |
| Next Track | Skip to next | `⌘ ⇧ →` |
| Previous Track | Go back | `⌘ ⇧ ←` |
| Search & Play | Find and play music | |
| Add to Queue | Add track to queue | |
| AI DJ Chat | Chat with AI | |
| Set Volume | Adjust volume | |
| Toggle Shuffle | Shuffle on/off | |
| Clear Queue | Clear playback queue | |
| Open Parachord | Launch the app | |
| Open Artist | Go to artist page | |

## Usage Tips

### Search & Play
- Use "Artist - Track" format for direct play: `Radiohead - Karma Police`
- Or just type a search query to open search in Parachord

### AI DJ Chat
- Use quick prompts from the action menu (`⌘ K`)
- Or type your own request like "play something chill"

### Keyboard Shortcuts
Set up your own shortcuts in Raycast Preferences → Extensions → Parachord

## Requirements

- [Parachord](https://parachord.com) desktop app must be installed
- macOS 10.15 or later
- Raycast 1.64.0 or later

## How It Works

This extension uses the `parachord://` URL protocol to communicate with the Parachord app. When you run a command, it opens a protocol URL that Parachord handles to perform the requested action.

## License

MIT
