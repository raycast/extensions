# Tana Paste - Raycast Extension

A Raycast extension that converts clipboard content to Tana Paste format. Perfect for quickly transforming Markdown text into Tana's node-based structure.

## Features

- Multiple ways to convert content:
  - Quick clipboard conversion (no UI)
  - Paste and edit interface for reviewing before conversion
  - Convert selected text directly
- Automatically converts clipboard content to Tana Paste format
- Supports Markdown elements:
  - Headings (H1-H6)
  - Bullet lists (`-`, `*`, `+`)
  - Numbered lists
  - Paragraphs
  - Nested content with proper indentation
- Specialized format support:
  - YouTube transcript timestamps
  - Limitless Pendant transcriptions
- Instant feedback via HUD notifications
- TypeScript implementation with strict typing
- Comprehensive error handling

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install Node.js and npm if you haven't already
3. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/tana-paste.git
   cd tana-paste
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
1. Copy your Markdown text to clipboard (⌘+C) (examples in the examples directory for testing)
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

## Backup Solution: Python Script

The Raycast extension is the primary way to convert content to Tana format. However, there are situations where you might need an alternative:

- When working with very large files (>100KB)
- When you don't have Raycast installed
- When you need to process multiple files in batch
- When you need more control over the conversion process

For these cases, we provide a Python script that implements the same conversion logic.

### Requirements
- Python 3.6 or later
- No additional dependencies required

### Usage

1. Convert a markdown file to Tana format and split into chunks:
   ```bash
   python3 tana_converter.py input.md -o output.txt
   ```
   This will create numbered output files (e.g., `output_1.txt`, `output_2.txt`, etc.)

2. Customize chunk size (default is 90KB):
   ```bash
   python3 tana_converter.py input.md -o output.txt --chunk-size 80000
   ```

3. Print chunks to console with separators:
   ```bash
   python3 tana_converter.py input.md
   ```

### Features
- Automatically splits large content into chunks under 100KB
- Each chunk starts with the `%%tana%%` header
- Maintains proper node structure when splitting
- Intelligently detects fields vs. regular text with colons
- Preserves bracketed elements in text that shouldn't be converted
- Handles URL and link syntax correctly
- Improved heading indentation logic
- Special format detection (YouTube timestamps, Limitless Pendant transcriptions)
- Supports all the same markdown elements as the Raycast extension
- UTF-8 encoding support
- Comprehensive error handling

### Example

Input file (`input.md`):
```markdown
# Project Overview

## Team Members
- John Smith - Project Lead
- Jane Doe - Developer
  - Skills: JavaScript, TypeScript
  - Start Date: 2024-03-15
```

Running the script:
```bash
python3 tana_converter.py input.md -o project.txt
```

This will create `project_1.txt` (and more if needed) with content like:
```
%%tana%%
- !! Project Overview
  - !! Team Members
    - John Smith - Project Lead
    - Jane Doe - Developer
      - Skills::JavaScript, TypeScript
      - Start Date::[[date:2024-03-15]]
```

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
- Meeting Title
  - Discussion Topic
    - Speaker 1: Hello everyone.
    - You: Good morning.
```

More examples can be found in the `examples/` directory, including:
- `examples/all-features.md`: All supported features in a single document
- `examples/limitless-pendant/`: Examples of Limitless Pendant transcription formats
- `examples/youtube-transcript-test.md`: Example of YouTube transcript timestamp format

## Development

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run lint` - Run linter

## Testing

### Test Structure
The Tana Paste project uses the following test structure:

- `src/utils/__tests__/tana-converter.test.ts` - Primary Jest test file that runs with `npm test`
- This file contains all the unit tests for the core conversion functionality

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Guidelines
1. **Add tests for new features**: All new functionality should have corresponding tests
2. **Test edge cases**: Ensure tests cover edge cases and error conditions
3. **Use Jest**: All new tests should be added to the Jest test suite
4. **Test organization**: Group related tests using `describe` blocks
5. **Keep test files together**: Place new test files in the `src/utils/__tests__/` directory to maintain organization

## Technical Details

- Built with TypeScript and strict type checking
- Uses Raycast API v1.55.2
- Follows functional programming principles
- Implements comprehensive error handling
- Includes proper input validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 