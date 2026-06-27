# Quick Start

## First launch

1. Open Raycast and type **Search Glean**
2. Press `Enter` to launch the command


```mermaid
flowchart TD
    A[Launch Search Glean] --> B{Cached server URL?}
    B -->|Yes| C[Open browser for OAuth]
    B -->|No| D[Prompt for work email]
    D --> E[Look up Glean server URL]
    E --> F[Cache URL in config.json]
    F --> C
    C --> G[Complete OAuth in browser]
    G --> H[Authenticated - ready to search]
```
### Authentication

On first launch, the extension checks whether you are signed in to Glean. There are two paths:

**If your Glean server URL is already cached** (from a previous login or a `~/.glean/config.json` file):

- The extension opens your browser for OAuth authentication
- Complete the sign-in flow in your browser
- Return to Raycast — you are now authenticated

**If your Glean instance is not yet known** (first time):

- The extension prompts you for your work email address
- Enter the email associated with your company's Glean instance
- The extension looks up your Glean server URL and caches it in `~/.glean/config.json`
- Your browser opens for OAuth authentication
- Complete the sign-in flow and return to Raycast

### Binary download

On first launch, the extension automatically downloads the `glean` CLI binary from GitHub Releases. The download includes SHA-256 verification. This is a one-time operation — the binary is cached and reused for subsequent launches.

## Searching

Once authenticated:

1. Type your query into the search field
2. Results appear as you type, showing:
   - **Title** of the matched document
   - **Datasource** subtitle (e.g., Confluence, Google Docs, Slack)
   - **Snippet** with context around your match
3. Press `Enter` to open a result in your default browser
4. Press `Cmd+C` to copy a result's URL to the clipboard

The search respects your Glean permissions — you only see results you have access to.

## Troubleshooting

- **"CLI not found"** — check your network connection and try again. The extension retries the download on the next launch.
- **"Not authenticated"** — run through the sign-in flow again. Your cached credentials may have expired.
- **No results** — verify your query spelling and check that your Glean instance indexes the documents you are looking for.
