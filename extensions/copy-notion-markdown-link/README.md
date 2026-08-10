# Copy Notion Markdown Link

Copy the current Notion page as a Markdown link in the format `[title](url)`.

## Requirements

- macOS
- [Notion desktop app](https://www.notion.so/desktop) (does not work with browser version)
- Accessibility permissions for Raycast

## Features

- Works with both normal and fullscreen Notion windows
- Automatically extracts page title and URL
- Escapes special characters in titles
- Preserves clipboard content on failure

## Usage

1. Open a Notion page in the Notion desktop app
2. Trigger the extension via Raycast
3. The Markdown link is copied to your clipboard

**Example output:**
```markdown
[My Project Documentation](https://www.notion.so/My-Project-Documentation-abc123)
```

## Troubleshooting

If the extension doesn't work:
- Ensure Notion desktop app is the frontmost application
- Check Raycast has Accessibility permissions in System Settings → Privacy & Security → Accessibility
- Verify you're on a valid Notion page (not settings or empty views)
