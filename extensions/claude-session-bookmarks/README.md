# Claude Session Bookmarks

Save your Claude Code session links and reopen them in one keystroke — instead of keeping a pile of `claude.ai/code` browser tabs open just to find your way back to a session.

## Commands

- **Add Session** — paste a session URL (and an optional label and repo) to save it.
- **Browse Sessions** — search your saved sessions, open them in the browser, edit, or remove them.

## Where do session links come from?

When you run Claude Code with Remote Control (`claude --remote-control` or `/remote-control`), it prints a session URL like `https://claude.ai/code/session_…` (also available as a QR code, and in the session list at [claude.ai/code](https://claude.ai/code)). Copy that link and add it here.

## Notes

- This extension stores your links locally in Raycast. It does not sign in to Claude or read any session status — opening a link relies on your browser being signed in to claude.ai.
- Removing a saved session only deletes the local bookmark; it does not affect the Claude session itself.
- Want live status (idle / working / waiting on you) across machines instead of static bookmarks? See the companion personal tool [claude-remote-sessions](https://github.com/eaescob/claude-remote-sessions). It isn't on the Store because it relies on an internal Anthropic API.

## Run it locally

### Prerequisites

- **macOS** with [Raycast](https://www.raycast.com/) installed.
- **Node.js 18+** and npm.

### Build and install

```bash
git clone https://github.com/eaescob/claude-session-bookmarks.git
cd claude-session-bookmarks
npm install
npm run dev        # builds and loads the extension into Raycast (keep running for hot-reload)
```

Then open Raycast and run **Add Session** / **Browse Sessions**. The extension stays installed after you stop the dev server.

### Other scripts

```bash
npm run build                    # type-check + production build
npm run lint                     # ESLint + Prettier + manifest checks
npm run fix-lint                 # auto-fix formatting
node scripts/generate-icon.mjs   # regenerate assets/command-icon.png
```
