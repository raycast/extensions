# Hister Raycast Extension

Search your personal browsing history and indexed web pages directly from Raycast using [Hister](https://github.com/asciimoo/hister).

## Prerequisites

This extension requires [Hister](https://github.com/asciimoo/hister) to be installed and running on your machine.

### 1. Install Hister

Install via Go:

```bash
go install github.com/asciimoo/hister@latest
```

Or download a pre-built binary from the [Hister Releases page](https://github.com/asciimoo/hister/releases) and place it in your `PATH` (such as `/usr/local/bin` or `~/go/bin`).

### 2. Start the Hister Daemon

Start the local server daemon:

```bash
hister listen
```

By default, Hister listens at `http://127.0.0.1:4433`.

### 3. Index Web Pages

Index URLs using the Hister CLI or companion browser extensions:

```bash
hister index https://example.com
```

## Features

- **Instant Search**: Search through titles, URLs, and indexed content.
- **Recent History**: When the search query is empty, your most recently visited pages are shown.
- **Domain Filtering**: Supports Hister syntax such as `domain:github.com` or keyword searches.
- **Quick Actions**:
  - `Enter` to open in browser
  - `Cmd+C` to copy URL
  - `Cmd+Shift+C` to copy title
  - `Cmd+Opt+H` to open the local Hister web interface
- **Cross-Platform**: Supports macOS, Windows, and Linux binary paths.

## Preferences

- **Hister Binary Path**: Optional custom path if `hister` is not in standard locations (`~/go/bin`, `/opt/homebrew/bin`, or `$PATH`).
- **Max Results**: Number of search results to return (default: 50, clamped between 1 and 200).
