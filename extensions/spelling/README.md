# Spelling for Raycast

A Raycast extension that checks spelling and suggests corrections using the macOS native dictionary. Inspired by [Alfred's spelling feature](https://www.alfredapp.com/help/features/dictionary/#spell).

## Features

- **Instant spell checking** - Type a word and get spelling suggestions as you type
- **Native macOS dictionary** - Uses the built-in `NSSpellChecker` for fast, offline spell checking
- **Correct word confirmation** - Shows a green "Correct" badge when a word is spelled correctly
- **Quick paste** - Press Enter to paste the corrected word directly into your active application
- **Multi-language support** - Supports 13 languages including English, Spanish, French, German, and more

## Usage

1. Open Raycast and search for "Check Spelling"
2. Type the word you're trying to spell (e.g., "spellng")
3. Select a suggestion from the list
4. Press Enter to paste the word into your active application

## Configuration

Access preferences via `Cmd+,` when the extension is open, or through Raycast Settings → Extensions → Spelling.

| Preference | Description | Default |
|------------|-------------|---------|
| **Primary Action** | Choose whether selecting a word pastes it to the active app or copies it to clipboard | Paste to Active App |
| **Show confirmation HUD** | Display an overlay confirmation after selecting a word | Off |
| **Close Raycast after action** | Automatically close Raycast after selecting a word | On |
| **Show suggestions for correct words** | Show similar word suggestions even when the typed word is spelled correctly | On |
| **Language** | Language for spell checking | English |

### Supported Languages

- English
- Spanish
- French
- German
- Italian
- Portuguese
- Dutch
- Swedish
- Norwegian
- Danish
- Finnish
- Polish
- Russian

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## How It Works

This extension uses AppleScript to interface with macOS's native `NSSpellChecker` API. This approach provides:

- **Offline functionality** - No internet connection required
- **Low latency** - Native system calls are fast
- **Consistent results** - Uses the same dictionary as other macOS apps

## License

MIT
