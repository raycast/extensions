# Figma Link Cleaner

Clean and shorten Figma URLs instantly with one hotkey. Perfect for sharing clean links with teammates.

## Features

- **One-hotkey workflow** — Press `Control+L` while in Figma to instantly copy a clean link
- **Aggressive URL cleaning** — Removes `www.`, file slugs, and tracking parameters
- **Optional URL shortening** — Create ultra-short `fgma.cc/abc123` links
- **Works from clipboard** — Clean any Figma URL already in your clipboard
- **Smart detection** — Automatically detects if Figma is the active app

## How It Works

### Before & After

| Original (~90 chars) | Cleaned (~50 chars) | Shortened (~21 chars) |
|---------------------|---------------------|----------------------|
| `https://www.figma.com/design/ABC123/My-Design?node-id=123%3A456&t=abc&fuid=999` | `https://figma.com/design/ABC123?node-id=123:456` | `https://fgma.cc/x7k9m2` |

### What Gets Removed

- `www.` prefix
- File name slug (decorative, Figma ignores it)
- Tracking parameters: `t`, `fuid`, `share_link_id`, `viewer`, etc.
- URL encoding (`%3A` → `:`)

### What's Preserved

- File key (required)
- `node-id` (your selected layer/frame)
- `page-id` (if present)

## Setup

**Set up the hotkey** (one-time):
1. Open Raycast Settings (`Cmd+,`)
2. Go to **Extensions** → Find **Figma Link Cleaner**
3. Click on "Clean Figma Link" command
4. Set hotkey to `Control+L` (or your preferred shortcut)

## Usage

### From Figma (Recommended)

1. Select a layer, frame, or component in Figma
2. Press `Control+L` (your configured hotkey)
3. The cleaned/shortened link is copied to your clipboard
4. Paste anywhere!

### From Clipboard

1. Copy any Figma URL (from Slack, email, browser, etc.)
2. Press `Control+L`
3. The URL is cleaned and copied back to your clipboard

## Preferences

| Setting | Description |
|---------|-------------|
| **Enable fgma.cc shortening** | Create ultra-short links via fgma.cc |
| **API Key** | Optional authentication for fgma.cc |

## Supported URL Formats

- `https://www.figma.com/file/...`
- `https://www.figma.com/design/...`
- `https://www.figma.com/proto/...`
- `https://www.figma.com/board/...` (FigJam)

## Requirements

- **Accessibility Permission** — Required for sending `Cmd+L` to Figma
  - System Settings → Privacy & Security → Accessibility → Enable Raycast

## Troubleshooting

### "Accessibility permission required"
Enable Raycast in System Settings → Privacy & Security → Accessibility

### "Couldn't copy from Figma"
Make sure you have a layer or frame selected in Figma, then try again.

### "No Figma link found"
Either select something in Figma, or copy a Figma URL to your clipboard first.

## Author

Created by [@iamshubhransh](https://raycast.com/iamshubhransh)

## License

MIT
