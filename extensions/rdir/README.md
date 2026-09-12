# Rdir - URL Shortener

Create short links using [rdir.pl](https://rdir.pl), a free URL shortener service.

## Features

- 🚀 **Two ways to shorten URLs:**
  - **Create Short Link** - Form view with URL preview and editing
  - **Shorten URL from Clipboard** - Instant background shortening
- 📋 **Auto-fill from clipboard** - Automatically populate URL from clipboard
- ✨ **Auto-copy results** - Short links copied to clipboard automatically
- ⌨️ **Keyboard shortcuts** - Assign custom hotkeys for quick access
- 🔒 **Secure API key storage** - Your credentials stored safely by Raycast

## Setup

### 1. Create a Free Account

To use this extension, you need a free rdir.pl account:

1. Visit [https://rdir.pl](https://rdir.pl)
2. Sign up for a free account

### 2. Get Your API Key

1. Go to [https://rdir.pl/api](https://rdir.pl/api)
2. Click "Create API Key"
3. Copy your API key

### 3. Configure the Extension

1. Open Raycast and search for "Create Short Link" or "Shorten URL from Clipboard"
2. On first run, you'll be prompted to configure your API key
3. Paste your API key in the **API Key** field
4. Optionally configure auto-fill and auto-copy preferences

## Usage

### Method 1: Form View (Review Before Shortening)

1. Copy a URL anywhere (or don't - you can type it manually)
2. Open Raycast and search for **"Create Short Link"**
3. The URL field will be auto-filled if you have a URL in clipboard
4. Review or edit the URL
5. Press `⌘ + ↵` to submit
6. Short link is created and copied to clipboard

### Method 2: Instant Background Shortening (Recommended)

1. Copy a URL anywhere
2. Open Raycast and search for **"Shorten URL from Clipboard"**
3. Press `↵` - that's it!
4. Short link is instantly created and copied to clipboard
5. HUD notification shows the result

**Pro tip:** Assign a hotkey to "Shorten URL from Clipboard" for even faster access:

- Right-click the command in Raycast
- Select "Set Hotkey"
- Choose your preferred keyboard shortcut (e.g., `⌘ + ⇧ + S`)

## Preferences

Configure the extension to match your workflow:

- **API Key** (required) - Your rdir.pl API key from [rdir.pl/api](https://rdir.pl/api)
- **Auto-fill from Clipboard** (default: enabled) - Automatically fill URL field from clipboard in form view
- **Auto-copy to Clipboard** (default: enabled) - Automatically copy short links to clipboard

## Troubleshooting

### "API Key Required" Error

- Make sure you've added your API key in extension settings
- Verify your API key is correct at [https://rdir.pl/api](https://rdir.pl/api)
- Press `⌘ + ,` when viewing the command to open settings

### "Clipboard doesn't contain a valid URL"

- Ensure you've copied a complete URL (must start with `http://` or `https://`)
- Try copying the URL again

### "Failed to create short link"

- Check your internet connection
- Verify your API key is still valid at [https://rdir.pl/api](https://rdir.pl/api)
- Make sure the rdir.pl service is operational

## About rdir.pl

[rdir.pl](https://rdir.pl) is a free URL shortener service that allows you to create short, memorable links. It's perfect for:

- Sharing long URLs in messages and social media
- Creating clean, professional-looking links
- Tracking link clicks (via rdir.pl dashboard)
- No ads or paywalls - completely free

## Support

- **rdir.pl service:** Visit [rdir.pl](https://rdir.pl) for support
- **API documentation:** [https://rdir.pl/api/docs](https://rdir.pl/api/docs)

## License

MIT
