# Configuration

## Raycast preferences

```mermaid
flowchart LR
    EV[Environment Variables<br/>GLEAN_SERVER_URL] -->|checked first| RESOLVED[Resolved Configuration]
    KR[macOS Keychain] -->|checked second| RESOLVED
    CFG[~/.glean/config.json] -->|checked last| RESOLVED
```


The extension does not require any Raycast preferences. All configuration is handled automatically:

- The Glean CLI binary is auto-downloaded and cached
- The Glean server URL is discovered via email lookup and cached
- Authentication state is managed by the Glean CLI

## `~/.glean/config.json`

The Glean CLI stores instance configuration in `~/.glean/config.json`. This file is created automatically after the first email-based instance lookup.

Example contents:

```json
{
  "server_url": "https://your-company.glean.com"
}
```

The extension reads this file to set the `GLEAN_SERVER_URL` environment variable when running Glean CLI commands. It never modifies this file directly.

## CLI binary cache

The auto-downloaded `glean` binary is stored in Raycast's support directory for this extension:

- macOS: `~/Library/Application Support/com.raycast.macos/extensions/glean-search/`

A metadata file (`cli-info.json`) in the same directory caches the downloaded version and its SHA-256 checksum for quick verification on subsequent launches.

## Environment variables

The extension sets the following environment variables when running Glean CLI commands:

- `GLEAN_SERVER_URL` — the resolved server URL from `~/.glean/config.json` (if available)
- `HOME` — forwarded from the parent process for config file resolution
