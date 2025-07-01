![paste-to-markdown](https://socialify.git.ci/wei/paste-to-markdown/image?description=1&font=JetBrains+Mono&language=1&logo=https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fwei%2Fpaste-to-markdown%2Fassets%2Fextension-icon.png&name=1&owner=1&pattern=Plus&theme=Auto)

A Raycast Extension that instantly pastes rich text or HTML content into Markdown.

![Settings Screenshot](https://cdn.jsdelivr.net/gh/wei/paste-to-markdown/media/preferences-screenshot.png)

## Features

- **Instant Conversion**: Convert HTML clipboard content to Markdown with a single command
- **Smart Detection**: Automatically detects HTML content in clipboard and provides helpful feedback for plain text
- **Customizable Output**: Configure Markdown formatting through Raycast preferences
- **Comprehensive Options**: Full control over Markdown formatting with all Turndown options
- **Robust Error Handling**: Graceful handling of edge cases with clear user feedback
- **Command Alias**: Quick access with the `pmd` alias

## Usage

1. Copy any HTML content from a webpage, email, or document
2. Run the "Paste to Markdown" command in Raycast (or use the `pmd` alias)
3. The converted Markdown will be automatically pasted into your active application
4. A confirmation HUD message will appear to confirm the action

## Preferences

Customize the Markdown output through Raycast's Preferences pane:

### Heading Style

- **ATX** (default): `## Heading`
- **Setext**: `Heading\n---`

### Horizontal Rule

- **Default**: `---`
- **Custom**: Any thematic break pattern

### Bullet List Marker

- **Hyphen** (default): `-`
- **Asterisk**: `*`
- **Plus**: `+`

### Code Block Style

- **Fenced** (default): ` ```code``` `
- **Indented**: 4-space indentation

### Code Fence Style

- **Backticks** (default): ` ``` `
- **Tildes**: `~~~`

### Emphasis Delimiter

- **Underscore** (default): `_text_`
- **Asterisk**: `*text*`

### Strong Delimiter

- **Double Asterisk** (default): `**text**`
- **Double Underscore**: `__text__`

### Link Style

- **Inline** (default): `[text](url)`
- **Referenced**: `[text][ref]`

### Link Reference Style

- **Full** (default): `[text][ref]`
- **Collapsed**: `[text][]`
- **Shortcut**: `[text]`

## Technical Details

- Built with TypeScript for Raycast
- Uses the [Turndown](https://github.com/mixmark-io/turndown) library for HTML-to-Markdown conversion
- Supports all Turndown configuration options for maximum customization
- Follows Raycast extension best practices and conventions

## Error Handling

The extension provides clear feedback for various scenarios:

- No HTML content in clipboard
- Plain text content (no conversion needed)
- Conversion errors
- Clipboard access issues
- Paste operation failures

## Development

To develop this extension locally:

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT
