# Pronunciation Lookup - Raycast Extension

A Raycast extension to quickly look up English word pronunciations with IPA (International Phonetic Alphabet) and audio playback.

## Features

- **Word Lookup**: Search any English word to get its pronunciation
- **IPA Display**: Shows phonetic transcription in IPA format (e.g., `/rɪˈzuːm/`)
- **Audio Playback**: Play pronunciation audio with a keyboard shortcut
- **Accent Detection**: Identifies US/UK/AU accents when available
- **Search History**: Remembers your recent searches for quick access
- **Part of Speech**: Shows whether the word is a noun, verb, adjective, etc.
- **Definitions**: Displays brief definitions alongside pronunciations
- **TTS Fallback**: For technical terms not in dictionary (e.g., "Supabase", "Kubernetes"), uses macOS Text-to-Speech with multiple accent options:
  - 🇺🇸 US English (Samantha)
  - 🇬🇧 UK English (Daniel)
  - 🇦🇺 Australian English (Karen)
  - 🇮🇳 Indian English (Veena)

## Usage

1. Open Raycast and search for "Spead Out"
2. Type any English word (e.g., "resume", "mermaid", "cache")
3. View the IPA pronunciation and press `Enter` to play audio
4. Use `Cmd+C` to copy the IPA

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Play pronunciation audio |
| `Cmd+C` | Copy IPA |
| `Cmd+Shift+C` | Copy word |
| `Ctrl+X` | Remove from history |
| `Ctrl+Shift+X` | Clear all history |

## Installation

```bash
# Navigate to extension directory
cd raycast

# Install dependencies
npm install

# Start development mode
npm run dev
```

Then open Raycast - the extension will appear at the top of your search.

## Project Structure

```
raycast/
├── package.json          # Raycast manifest & dependencies
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.tsx         # Main command UI (List component)
│   ├── types.ts          # TypeScript type definitions
│   ├── api/
│   │   └── dictionary.ts # Free Dictionary API client
│   ├── hooks/
│   │   └── useHistory.ts # Search history with LocalStorage
│   └── utils/
│       └── audio.ts      # Audio playback via afplay
└── assets/
    └── icon.png          # Extension icon (512x512 PNG)
```

## API

Uses the [Free Dictionary API](https://dictionaryapi.dev/) - completely free, no API key required.

**Endpoint**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

## Technical Notes

- **Audio Playback**: Uses macOS `afplay` command to play MP3 files
- **Text-to-Speech**: Uses macOS `say` command for words not in dictionary
- **Debouncing**: 300ms delay before API call to avoid excessive requests
- **History Storage**: Uses Raycast's LocalStorage API (stores last 20 searches)

## Future Enhancements

- [ ] Add Forvo API integration for real human pronunciations
- [ ] Favorite words list
- [ ] Show all definitions in a detail view
- [ ] Support for phrases and idioms
- [ ] Offline mode with cached pronunciations
- [ ] More TTS voice options

## Requirements

- macOS
- Raycast 1.26.0+
- Node.js 22.14+

## License

MIT
