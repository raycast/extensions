# Tana Paste for Raycast

A Raycast extension that converts clipboard content to Tana Paste format. Perfect for quickly transforming Markdown text into Tana's node-based structure.

## Features

- Multiple ways to convert content:
  - Quick clipboard conversion (no UI)
  - Paste and edit interface for reviewing before conversion
  - Convert selected text directly
  - Extract YouTube video metadata directly from browser
- Automatically converts clipboard content to Tana Paste format
- Supports Markdown elements:
  - Headings (H1-H6)
  - Bullet lists (`-`, `*`, `+`)
  - Numbered lists
  - Paragraphs
  - Nested content with proper indentation
- Specialized format support:
  - YouTube transcript
  - Limitless Pendant transcriptions
- Instant feedback via HUD notifications
- TypeScript implementation with strict typing
- Comprehensive error handling

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install Node.js and npm if you haven't already
3. Clone this repository:
   ```bash
   git clone https://github.com/lisaross/tana-paste-for-raycast.git
   cd tana-paste-for-raycast
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Build the extension:
   ```bash
   npm run build
   ```
6. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

### Quick Clipboard Conversion
1. Copy your Markdown text to clipboard (⌘+C)
2. Open Raycast (⌘+Space)
3. Type "Quick Clipboard to Tana"
4. Press Enter
5. Your clipboard now contains the Tana-formatted version
6. Paste into Tana (⌘+V)

### Paste and Edit Mode
1. Open Raycast (⌘+Space)
2. Type "Paste and Edit for Tana"
3. Press Enter
4. Edit your text in the interface
5. Press Enter to convert and copy to clipboard
6. Paste into Tana (⌘+V)

### Convert Selected Text
1. Select text in any application
2. Open Raycast (⌘+Space)
3. Type "Convert Selected Text to Tana"
4. Press Enter
5. The converted text is now in your clipboard
6. Paste into Tana (⌘+V)

### YouTube to Tana
1. Open a YouTube video in your browser
2. Open Raycast (⌘+Space)
3. Type "YouTube to Tana"
4. Press Enter
5. Video metadata and transcript (if available) are extracted, formatted, and copied to your clipboard
6. Paste into Tana (⌘+V)

**Features:**
- Extracts video title, URL, channel information, and description
- Automatically retrieves video transcript (when available)
- Formats everything in Tana's node structure
- Works with videos in any language that has captions

**Troubleshooting:**
- Make sure you have at least one YouTube watch page open (not a channel, home, or shorts page)
- If you get "Can't find video description" errors, try clicking "Show more" on the description
- Not all videos have transcripts available - in this case, only the metadata will be extracted
- For videos with multiple language options, the default language is extracted

## Example

Input (in clipboard):
```markdown
# My Heading
## Subheading
- List item 1
  - Nested item
- List item 2
```

Output (in clipboard):
```
%%tana%%
- !! My Heading
  - !! Subheading
    - List item 1
      - Nested item
    - List item 2
```

### Limitless Pendant Transcription Example

Input:
```markdown
# Meeting Title

## Discussion Topic

> [Speaker 1](#startMs=1743688649931&endMs=1743688652931): Hello everyone.

> [You](#startMs=1743688652931&endMs=1743688653931): Good morning.
```

Output:
```
%%tana%%
- !! Meeting Title
  - !! Discussion Topic
    - Speaker 1: Hello everyone.
    - You: Good morning.
```

### YouTube Transcript Example

Input:
```markdown
> [00:00] Introduction to the topic
> 
> [01:30] Key concept explanation
> 
> [05:45] Summary and conclusion
```

Output:
```
%%tana%%
- [00:00] Introduction to the topic
- [01:30] Key concept explanation
- [05:45] Summary and conclusion
```

## Development

This project is built with:
- TypeScript
- Raycast Extension API

For development, you can use the standard Raycast development commands:

```bash
npm run dev     # Development mode with hot reload
npm run build   # Build the extension
```

## License

MIT License 