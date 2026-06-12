# FlowFerry

Save articles to your FlowFerry library without leaving the keyboard.

FlowFerry is a cross-platform read-it-later app — this extension lets you push articles from any browser into your FlowFerry inbox via Raycast.

## Commands

- **Save Active Tab** — saves the article in your active browser tab. Requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension) companion (Chrome, Safari, Arc, Edge, Firefox, Brave, Vivaldi).
- **Save URL** — opens a small form to save a specific URL (prefilled from your clipboard if it looks like a URL).

Saved articles appear in the FlowFerry app on your next sync.

## Setup

1. Open https://flowferry.app/account and sign in.
2. Under **API Key**, click **Generate API Key** and copy the value once it appears (you only see it once).
3. Run any FlowFerry command in Raycast — you'll be prompted for the API Key. Paste it.
4. You're done — `Save Active Tab` is now the fastest way to push an article into your library.

If you ever lose the key or want to revoke device access, rotate it from the same page. The Raycast extension preference will need to be updated with the new key.

## Privacy

The extension talks to a single endpoint: `https://flowferry.app/api/v1/articles`. It does not collect telemetry, does not phone home on launch, and does not read browser data outside of the active tab when you explicitly invoke a save command.
