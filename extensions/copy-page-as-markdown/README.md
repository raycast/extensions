# Copy Page as Markdown

A Raycast extension that copies any webpage as clean Markdown, perfect for pasting into notes, documentation, or AI chats.

## Features

- **High-quality conversion**: Uses Turndown (the same library as Firecrawl) for reliable HTML to Markdown conversion
- **GitHub Flavored Markdown**: Supports tables, strikethrough, and other GFM features
- **Smart cleanup**: Removes page structure elements (headers, footers, nav) while preserving all content
- **One-command simplicity**: Just run the command and the markdown is copied to your clipboard

## What Gets Removed

The extension removes non-content HTML elements before conversion:

- Scripts, styles, and meta tags
- Page structure: headers, footers, navigation, sidebars
- UI elements: buttons, forms, comments

**Important**: No text content is removed - only HTML structural elements. If a page mentions "Skip to Content" or "Copy" in the actual content, that text is preserved.

## Usage

1. Make sure you have the [Raycast Browser Extension](https://www.raycast.com/browser-extension) installed
2. Navigate to any webpage in your browser
3. Open Raycast and run "Copy Page as Markdown"
4. The page content is now in your clipboard as clean Markdown!

## How It Works

This extension:
1. Gets the HTML from your current browser tab via Raycast's Browser Extension API
2. Converts it to Markdown using Turndown with GitHub Flavored Markdown support
3. Applies post-processing to clean up links and remove navigation elements
4. Copies the result to your clipboard

The conversion logic is inspired by [Firecrawl's HTML to Markdown implementation](https://github.com/mendableai/firecrawl).


## License

MIT