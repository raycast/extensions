# Slack Link Formatter for Raycast

A Raycast extension that converts a URL on your clipboard into a rich title hyperlink that pastes cleanly into Slack.

## Prerequisites

- macOS with [Raycast](https://www.raycast.com/) installed.
- A URL copied to your clipboard before running the command.
- Optional: [GitHub CLI](https://cli.github.com/) installed and authenticated with `gh auth login` for better titles on GitHub pull request and issue links.
- For local development: Node.js and npm.

## How It Works

1. Copy a URL.
2. Run **Copy Slack Link from Clipboard URL** in Raycast.
3. Paste into Slack.

The command fetches the page title, then writes two clipboard representations:

- Plain text: the raw URL
- HTML: an anchor tag whose visible text is the page title

Slack prefers the HTML representation and shows a clickable title hyperlink. Apps that only support plain text receive the original URL.

## GitHub Links

For GitHub pull requests and issues, the command first tries to use the GitHub CLI (`gh`) to fetch the title when `gh` is installed and authenticated. This helps with links that do not expose complete page metadata to unauthenticated requests.

If `gh` is unavailable or the lookup fails, the command falls back to fetching the page HTML directly.

## Development

Install dependencies and run the extension locally:

```bash
npm install
npm run dev
```

Validate before publishing:

```bash
npm run lint
npm run build
```
