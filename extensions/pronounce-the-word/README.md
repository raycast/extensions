# Pronounce the Word

Learn to pronounce any word correctly with audio playback, phonetic spelling, and comprehensive definitions.

## Features

- **Audio Pronunciation**: Play audio pronunciations with a single keyboard shortcut (⌘1, ⌘2, etc.)
- **Phonetic Spelling**: View IPA (International Phonetic Alphabet) transcriptions with accent labels
- **Multiple Accents**: Access different pronunciations (British, American) when available
- **Comprehensive Definitions**: See word meanings, parts of speech, and example sentences
- **Synonyms & Antonyms**: Expand your vocabulary with related words
- **Search History**: Automatically saves your last 30 word searches for quick access
- **Smart Suggestions**: Get word suggestions when a word isn't found

## Usage

### Searching for a Word

1. Open Raycast and type "Pronounce"
2. Type any word in the search bar
3. Press Enter to view pronunciation details

### Playing Audio

In the word details view:
- Press **⌘1** to play the first pronunciation
- Press **⌘2** to play the second pronunciation (if available)
- Or open the action menu (⌘K) and select a pronunciation option

The keyboard shortcuts are displayed at the top of the details page for quick reference.

### Managing History

Your last 30 word searches are automatically saved:
- Click on any history item to view it again
- Each history item shows a trash icon on the right
- Press **⌃X** (Control+X) to delete a word from history
- Or open the action menu (⌘K) and select "Remove from History"

### Word Not Found?

If a word isn't found, you'll see:
- An error message: "Cannot find the word"
- A list of suggested similar words
- Click on any suggestion to look it up instantly

## Technical Details

### APIs Used

1. **Free Dictionary API**: Comprehensive word data with audio files, phonetic spellings, and definitions
2. **Datamuse API**: Provides word suggestions for typos or unknown words

### Audio Playback

Audio files are downloaded and played using platform-specific commands for reliable playback:
- **macOS**: Native `afplay` command
- **Windows**: PowerShell with .NET System.Media.SoundPlayer
- **Linux**: `ffplay` or `mpv`

### Storage

Word history is stored locally using Raycast's LocalStorage API, limited to the 30 most recent searches.

## Keyboard Shortcuts

- **⌘1, ⌘2, etc.**: Play pronunciation audio (in word details)
- **⌃X**: Delete word from history (in history list)
- **⌘K**: Open action menu
- **Enter**: Look up the typed word
- **Esc**: Go back to search

## License

MIT