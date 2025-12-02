# Kalpa for Raycast

Search and manage your saved links in Kalpa directly from Raycast.

![Kalpa Extension](./media/extension-icon.png)

## Features

### 🔍 Search Links

Instantly search across all your saved links, videos, and CodePens. Filter by universe, view summaries, and open links directly in your browser.

### 🌌 Browse Universes

Navigate your link collections (Universes) and quickly access organized content.

### ⚡ Quick Save

Save the current browser tab to Kalpa with a single keystroke. Works with Safari, Chrome, Arc, Brave, Edge, and more.

### 🕐 Recent Links

View your most recently saved links grouped by time period (Today, Yesterday, This Week).

## Setup

### Quick Setup (Recommended)

1. Open Raycast and search for "Kalpa".
2. Run the **"Login to Kalpa"** command.
3. Click **"Login to Kalpa"** to open the auth page in your browser.
4. Sign in to your Kalpa account if needed.
5. Copy the API token shown on the page.
6. Go back to Raycast → Extension Preferences (⌘ + ,).
7. Paste the token in the **"API Token"** field.

That's it! You're ready to use Kalpa from Raycast.

### Manual Setup

If the quick setup flow doesn’t work for some reason:

1. Visit [usekalpa.com/raycast](https://usekalpa.com/raycast) in your browser.
2. Sign in to your Kalpa account if needed.
3. Copy the API token shown on the page.
4. In Raycast, open **Extensions → Kalpa → Preferences**.
5. Paste the token into the **API Token** field and save.

> **Note:** API tokens expire after ~1 hour. When you see auth errors, visit
> [usekalpa.com/raycast](https://usekalpa.com/raycast) to get a fresh token.

## Commands

| Command          | Description                | Shortcut |
| ---------------- | -------------------------- | -------- |
| Login to Kalpa   | Connect your Kalpa account | -        |
| Search Links     | Search all saved links     | -        |
| Browse Universes | Browse links by universe   | -        |
| Quick Save       | Save current browser tab   | -        |
| Recent Links     | View recently saved links  | -        |

## Keyboard Shortcuts

When viewing links:

- `↵` – Open in browser
- `⌘ + O` – Open in Kalpa app
- `⌘ + R` – Toggle read status
- `⌘ + A` – Toggle archive status
- `⌘ + C` – Copy URL
- `⌘ + ⇧ + C` – Copy title

## Supported Browsers

Quick Save works with:

- Safari
- Google Chrome
- Arc Browser
- Brave
- Microsoft Edge
- Opera
- Vivaldi
- Chromium

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Tech Stack

- [Raycast API](https://developers.raycast.com)
- [Convex](https://convex.dev) – Real-time backend for Kalpa
- TypeScript + React

## Troubleshooting

### "Connection Failed" or timeout errors

- Check your internet connection.
- Verify that [https://usekalpa.com](https://usekalpa.com) loads in your browser.
- Try again in a few seconds (the Kalpa backend may be restarting).
- If the issue persists, contact support via the Kalpa app.

### "Authentication Required" or "Login Required" errors

- Your API token has expired (tokens last ~1 hour).
- Run the **"Login to Kalpa"** command and follow the steps to get a fresh token.
- Or visit [usekalpa.com/raycast](https://usekalpa.com/raycast) directly.

### "Not authenticated" in Convex logs

- The API token is missing or invalid.
- Make sure you copied the full token from the auth page.
- Ensure you're signed into the correct Kalpa account when getting the token.

### Quick Save not working

- Make sure Raycast has Automation permission for your browser.
- Go to: System Settings → Privacy & Security → Automation.
- Enable Raycast for Safari/Chrome/Arc/etc.

### Extension not finding links

- Make sure you're signed into the same Kalpa account you used to get the API token.
- Confirm you actually have saved links in Kalpa (open [https://usekalpa.com](https://usekalpa.com)).
- If you recently added links, wait a few seconds and try again.
- If search still returns nothing, try getting a fresh API token from
  [usekalpa.com/raycast](https://usekalpa.com/raycast) and updating it in Raycast.

## Links

- [Kalpa Web App](https://usekalpa.com)
- [Kalpa Raycast Extension Source](https://github.com/usekalpa/kalpa-raycast-extension)

## License

MIT

