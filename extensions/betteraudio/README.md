# BetterAudio for Raycast

Control [BetterAudio](https://betteraudio.pro) from Raycast.

This extension gives you quick access to:

- system volume and mute controls
- audio device switching
- per-app audio management
- media playback controls
- Bluetooth audio device status
- a persistent menu bar command

## Requirements

Before using this extension, make sure you have:

1. **BetterAudio.app installed**
2. **BetterAudio running**
3. **The BetterAudio CLI installed**

The Raycast extension talks to BetterAudio through the `betteraudio` CLI.

## Setup

### 1. Install BetterAudio

Install and launch BetterAudio on your Mac.

### 2. Install the CLI

In BetterAudio, open:

**Settings → General → CLI**

Then click **Install**.

The CLI interface should be installed in the `/usr/local/bin/betteraudio` directory

## Troubleshooting

### “BetterAudio CLI not found”

- Install the CLI from **BetterAudio → Settings → General → CLI**
- Or set the correct path in the extension preferences

### “BetterAudio is not running”

- Launch BetterAudio.app
- Wait a moment for the CLI server to start
- Run the command again in Raycast

## Development checklist

Before publishing, validate the extension locally:

```bash
npm run lint
npm run build
```