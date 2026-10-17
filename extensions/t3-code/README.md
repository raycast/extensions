# T3 Code for Raycast

Three commands against the T3 Code server running on this Mac.

- **Prompt T3 Code** — write a prompt, attach files, pick a preset (project, model, permissions and workspace), optionally branch into a git worktree. Creates the thread, sends the prompt, opens the thread in T3 Code.
- **Waiting T3 Threads** — active threads (not settled, snoozed or archived) whose agent has stopped.
- **Search T3 Threads** — every live thread, by title, project or branch.

## Prompt T3 Code

- **Files** take any file type, up to 8 per prompt: images up to 10 MB, other files up to 50 MB.
  A screenshot on the clipboard is attached when the command opens, unless it was already sent.
  `⌘⇧V` attaches one copied later, `⌘⇧A` attaches the files selected in Finder, and `⌘Y` previews
  what is attached. Protocol v1 servers accept images only.
- **Preset** is the project, model, permissions and workspace in one choice. Starred presets come
  first, then the combinations you used recently. `⌘D` stars the current settings, and again
  unstars them. Choose Custom… for the separate fields. Model names show the provider and effort,
  for example `Claude · Sonnet 5.5 · high · 1M`.
- `↵` sends and opens the thread in T3 Code. `⌘⇧↵` sends and leaves T3 Code alone.
- Worktrees need the project folder on this Mac, because the base branch is read from its git
  repository.

## Setup

Issue a token and paste it into the extension preferences on first run:

```
# Server address: the running server publishes it here.
ORIGIN=$(node -p "JSON.parse(require('fs').readFileSync(process.env.HOME+'/.t3/userdata/server-runtime.json','utf8')).origin")
# If that file is missing or has no origin, or you set the Server Origin preference,
# use that value instead:
# ORIGIN=http://127.0.0.1:3773

# Issue the token with the CLI at the server's own version.
VERSION=$(curl -s $ORIGIN/.well-known/t3/environment | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).serverVersion")
npx t3@$VERSION auth session issue --ttl 365d --label raycast --token-only
```

The CLI must match the server's version: a token issued by a different version can be
written to the previous database, and the server then rejects it. The commands use only
`node`, `curl` and `npx`, which come with macOS and Node.

Revoke it with `t3 auth session revoke`, list sessions with `t3 auth session list`.

The server origin comes from `~/.t3/userdata/server-runtime.json` unless the
`Server Origin` preference is set, so a restarted server on a new port needs no
reconfiguration.

## How it talks to T3

Everything runs against the T3 Code server on this machine, over loopback:

- `GET /api/orchestration/shell` for projects and threads.
- `GET /.well-known/t3/environment` for the server's orchestration protocol version.
- `GET /api/auth/websocket-ticket`, then a WebSocket to `/ws`, for creating threads on protocol v2.
- `POST /api/orchestration/dispatch` for `thread.create` and `thread.turn.start` on protocol v1.

On protocol v2 the extension sends the `x-t3-orchestration-protocol` header and maps the
v2 thread fields onto the v1 shape. v2 removed thread creation over HTTP, so Prompt T3 Code
uses one `orchestration.launchThread` call over the WebSocket: it creates the thread, prepares
the worktree and sends the first message. Attachments are uploaded first through
`attachments.createUploadUrl`. On v1 the images travel inside the turn as data URLs.

Opening a thread activates T3 Code and drives its command palette, because the
desktop app registers `t3code://` for its own auth callbacks and an external URL
only reveals the window. The extension types the thread's title, project and
branch, and presses Enter only when that query matches exactly one thread;
otherwise the palette stays open on the narrowed list for you to pick from.
macOS asks for Accessibility permission the first time.

The app is found by release channel. The stable build is named `T3 Code (Alpha)` and the
Nightly build `T3 Code (Nightly)`. With the `App Name` preference empty, the extension
picks one from the running server's version, or from the installed apps when no server
is running. Set the preference to override it.

On v1 the extension creates worktrees itself with `git worktree add`, since the HTTP
dispatch handler passes commands straight to the engine and never runs the
server's worktree bootstrap. The path matches T3's own convention,
`~/.t3/worktrees/<repo>/<branch>`. On v2 the server prepares the worktree.

The preset list comes from the threads you ran recently, so the extension carries no model
list of its own. Provider names, custom models and starred models are read from
`~/.t3/userdata/settings.json` and `model-manifest.json`, read-only.

## Development

```
npm install
npm run dev
```
