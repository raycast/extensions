# Glean Search

Search your company's knowledge base via [Glean](https://glean.com) directly from Raycast.

## Getting Started

1. Install the extension from the Raycast Store
2. Open **Search Glean** in Raycast
3. If you're not signed in, the extension either:
   - Opens a browser for OAuth (if it knows your Glean server URL from a previous login), or
   - Asks for your **work email** to look up your Glean instance (first time)

Your work email is used once to discover your Glean instance. The server URL is cached in `~/.glean/config.json` for subsequent logins.

The `glean` CLI binary is auto-downloaded from GitHub Releases on first launch — no manual installation needed.

## Advanced: Managing the CLI yourself

If you prefer to manage the CLI binary yourself:

```bash
brew install gleanwork/tap/glean-cli
```

The extension automatically discovers the system-installed binary before falling back to auto-download.

## Usage

1. Open Raycast
2. Type **Search Glean**
3. Enter your query — results appear with title, source, and snippet preview
4. `Enter` to open in browser, `Cmd+C` to copy URL
