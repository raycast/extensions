# Voice Thing

Search MyInstants memes from Raycast, then copy or play a normalized audio file into the app you were using.

## Usage

1. Open **Play Meme** in Raycast.
2. Type a sound name such as `vine boom` or `bruh`.
3. Press `Enter` to play the prepared audio file into the active app.

The extension downloads clips into Raycast's extension support folder, normalizes clips to M4A when macOS can decode them, and stores favorites and recents locally. It does not send messages automatically.

## Notes

- No API key is required.
- Audio comes from MyInstants search results.
- Voice Thing is not affiliated with or endorsed by MyInstants.
- Sounds are hosted by MyInstants and uploaded by its users. Make sure you have the right to use a sound before sharing it.
- Play/paste support depends on the receiving app accepting audio files from the macOS clipboard.
- The extension is macOS-only because it uses the built-in `/usr/bin/afconvert` audio converter.
