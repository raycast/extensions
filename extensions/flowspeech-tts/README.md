# FlowSpeech TTS for Raycast

Turn selected or copied text into natural speech without leaving your current app. The extension uses the public [FlowSpeech](https://flowspeech.io/) text-to-speech API and plays the generated audio directly on macOS.

## Features

- Speak text selected in any macOS application
- Speak text currently stored in the clipboard
- Choose from Kore, Puck, Charon, Aoede, and Fenrir voices
- Keep your API key in Raycast's encrypted preferences
- Play generated audio locally with the built-in macOS audio player

## Setup

1. Create an API key in [FlowSpeech API settings](https://flowspeech.io/settings/apikeys/create).
2. Open either extension command in Raycast.
3. Paste the API key into the required preference and choose a voice.

## Usage

### Speak Selected Text

Select text in another application, open Raycast, and run **Speak Selected Text**.

### Speak Copied Text

Copy text to the clipboard, open Raycast, and run **Speak Copied Text**.

The extension supports up to 10,000 characters per request. FlowSpeech account quotas apply.
