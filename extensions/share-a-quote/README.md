# Share a Quote

Copy selected text as a formatted quote with source link from any application.

## Features

- Copy any selected text as a beautifully formatted quote
- Automatically includes the source URL from your current browser tab
- No-view command for quick execution

## Usage

1. Select any text in any browser
2. Run the "Copy Selected Text as Quote with Link" command in Raycast
3. The formatted quote with source link will be copied to your clipboard

## Output Format

The extension formats your selected text like this:

```
> "Welcome!"

https://alexi.build/
```

## Requirements

- [Raycast Browser Extension: Summarize and Automate Your Tabs](https://www.raycast.com/browser-extension) for URL detection

## Installation

Install this extension from the Raycast Store or clone this repository and run:

```bash
npm install
npm run dev
```

## How It Works

1. **Text Selection**: Uses Raycast's `getSelectedText()` API to capture highlighted text
2. **URL Detection**: Gets the current browser tab URL via Browser Extension
3. **Formatting**: Combines text and URL into a clean quote format
4. **Copy**: Places the formatted result in your clipboard

## Error Handling

- Shows helpful error messages if no text is selected
- Shows error message if no browser URL is available
- Requires active browser tab for URL detection

## Privacy

This extension only accesses:

- Selected text (when you run the command)
- Current browser tab URL via browser extension

No data is transmitted to external servers.
