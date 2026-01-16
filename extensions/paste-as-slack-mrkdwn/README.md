# Paste as Slack mrkdwn

Paste Markdown or rich text into Slack with proper formatting. Works great with content copied from ChatGPT, Notion, Google Docs, and other apps.

## How to Use

### Step 1: Copy
Copy text from any source:
- ChatGPT responses
- Notion pages
- Markdown files
- Any rich text with formatting

### Step 2: Focus Slack
Click in a Slack message input field where you want to paste.

### Step 3: Run the Command
Open Raycast and run **"Paste as Slack mrkdwn"**

That's it! Your text is pasted with Slack-compatible formatting.

> **Tip:** Assign a keyboard shortcut in Raycast for even faster access.

## What Gets Converted

| You Copy | Slack Shows |
|----------|-------------|
| `# Heading` or `## Heading` | **Bold heading** |
| `**bold text**` | **bold text** |
| `*italic text*` | _italic text_ |
| `~~strikethrough~~` | ~strikethrough~ |
| `[link text](url)` | Clickable link |
| `- bullet point` | • bullet point |
| `` `inline code` `` | `inline code` |
| Code blocks | Preserved exactly |
| `---` horizontal rule | ——— |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Auto-format in Slack** | On | Automatically applies Slack's formatting shortcut after pasting |

You can disable auto-format in the extension preferences if you prefer to format manually.

## Requirements

- macOS
- Raycast
- **Accessibility permissions** for Raycast (if auto-format is enabled)

### Why Accessibility Permissions?

After pasting, the extension automatically sends keyboard shortcuts to format the text in Slack:
- `Cmd+A` to select all
- `Cmd+Shift+F` to apply Slack formatting

Grant permissions in: **System Settings → Privacy & Security → Accessibility → Raycast**

## Troubleshooting

**Text pastes but doesn't format:**
- Make sure Raycast has Accessibility permissions
- Ensure you're focused on a Slack message input

## License

MIT
