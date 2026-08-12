# ClaudeScope for Raycast

Search and open local coding-agent transcript history from Raycast. The
extension works with Claude Code, Codex, Copilot CLI, Junie, pi, opencode,
Antigravity, and Grok sessions already indexed by
[ClaudeScope](https://github.com/vladar107/claudescope).

## Requirements

- macOS with Raycast
- ClaudeScope 0.17.0 or later (the first release with session deep links)

Install ClaudeScope using any supported channel, then run it once. The full
instructions are in ClaudeScope's
[Quick start](https://github.com/vladar107/claudescope#quick-start).

With npm (requires Node.js 22.12 or later):

```bash
npm install --global @vladar107/claudescope
claudescope
```

With Homebrew:

```bash
brew tap vladar107/tap
brew install claudescope
claudescope
```

With Nix:

```bash
nix profile install github:vladar107/claudescope
claudescope
```

The extension discovers `claudescope` through your login shell and common npm,
Homebrew, and Nix locations. If discovery does not match your setup, set the
absolute executable path in the extension preferences.

## Commands

- **Search ClaudeScope** — debounced full-text search with exact message links.
- **Recent Sessions** — browse and locally filter the 75 most recent sessions.
- **Open ClaudeScope** — start the daemon if needed and open the local web app.

## Privacy

The extension invokes the installed `claudescope` CLI with bounded, read-only
JSON queries. It does not read agent transcript directories or ClaudeScope's
DuckDB index directly. It has no network client, account, API key, analytics, or
telemetry; transcript snippets stay on the Mac and are rendered only in Raycast.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

`npm run publish` is intentionally a separate maintainer step that opens a pull
request to the Raycast extensions repository.
