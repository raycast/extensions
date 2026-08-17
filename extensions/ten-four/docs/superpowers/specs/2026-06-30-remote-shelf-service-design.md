# Ten Four — Remote Shelf Service (design)

**Date:** 2026-06-30
**Status:** Approved, ready for implementation plan

## Problem

Ten Four's shelf is a local JSON file (`~/.ten-four.json`). The `tenfour` CLI
writes it; the Raycast extension watches it. This works only when the CLI and
Raycast run on the **same machine**.

The work environment has changed: Claude Code now runs on a remote box (Guppy,
an always-on AWS EC2 host on the personal tailnet), while Raycast runs on the
Mac. The CLI writes Guppy's `~/.ten-four.json`; Raycast watches the Mac's. They
never meet. The local file is no longer a viable shared transport.

## Goal

Replace the local-file transport with a small **shelf service** so a push from
anywhere on the tailnet (Guppy, the Mac, the shelf-push hook) appears in Raycast
on the Mac.

## Decisions

These were settled during brainstorming:

1. **Shelf service on Guppy**, reachable over the tailnet — not a public cloud
   service and not file-sync. Everything stays on the private network.
2. **Service-only.** No local-file fallback mode. The extension is not on the
   Raycast Store yet, so there is no installed base to preserve. One code path.
3. **Standalone service in this repo.** ten-four becomes a self-contained trio:
   `server/`, the `tenfour` CLI, and the Raycast extension. The server is not
   folded into the separate guppy-launcher codebase.
4. **Exposed on a path** under the existing hostname via `tailscale serve`:
   `https://guppy.tail72863e.ts.net/shelf` → `127.0.0.1:7801`. One TLS endpoint,
   one hostname.
5. **No auth token.** `tailscale serve` restricts access to devices on the
   personal tailnet; that is the security boundary. A shared-token check is a
   possible future add (one env var) but is out of scope now.

## Architecture

```
push from anywhere          shelf service (Guppy)          read on Mac
┌─────────────────┐         ┌──────────────────────┐       ┌──────────────┐
│ tenfour CLI     │  HTTPS  │ ten-four-shelf         │ HTTPS │ Raycast ext  │
│ (Guppy / Mac /  │ ──────▶ │ Node HTTP server       │ ◀──── │ polls GET    │
│  shelf-push hook)│  POST  │ 127.0.0.1:7801         │  GET  │ /shelf       │
└─────────────────┘         │ owns ~/.ten-four.json  │       └──────────────┘
                            └──────────────────────┘
                                     ▲
                          tailscale serve  /shelf/* → 127.0.0.1:7801
                          https://guppy.tail72863e.ts.net/shelf
```

The server is the **single owner** of the JSON store. Clients never touch the
file directly — they call the API. This also removes the old multi-writer race
where the CLI and the extension both wrote the same file.

## The shelf API

Item shape is unchanged: `{ id, label, text, ts, pinned }`.

| Method   | Path         | Body            | Returns                          |
|----------|--------------|-----------------|----------------------------------|
| `GET`    | `/shelf`     | —               | `Item[]`, sorted pinned-first then newest |
| `POST`   | `/shelf`     | `{label?, text}`| the created `Item` (server fills `id`, `ts`, `pinned:false`) |
| `PATCH`  | `/shelf/:id` | `{pinned}`      | the updated `Item` |
| `DELETE` | `/shelf/:id` | —               | `{ok:true}` |
| `DELETE` | `/shelf`     | —               | `{ok:true}` (clear all) |

- All requests/responses are JSON. `POST` with empty/whitespace `text` →
  `400`.
- Unknown `:id` on `PATCH`/`DELETE` → `404`.
- `MAX_ITEMS` (200) truncation and pinned-retention move **server-side**: after
  an add, keep all pinned items plus the most recent `MAX_ITEMS` unpinned.
- `id` generation and `firstLine`-derived default label move server-side too.

## Components

### `server/` (new)

- Dependency-free Node HTTP server, single file (~150 lines). Mirrors the style
  of the existing CLI (no framework, plain `http`/`fs`).
- Reads/writes the JSON store at `~/.ten-four.json`, overridable with
  `TENFOUR_FILE`. Load is fault-tolerant (missing/corrupt file → `[]`), same as
  today.
- Listens on `127.0.0.1:$PORT`, default **7801** (override `PORT` /
  `TENFOUR_PORT`). Binds loopback only; `tailscale serve` provides TLS and
  tailnet exposure.
- Ships with: a `systemd` unit file (`ten-four-shelf.service`) and a documented
  `tailscale serve` command, both referenced from the README.

### `tenfour` CLI (`assets/tenfour`)

- Drops all local-file read/write.
- Reads the service URL from **`TENFOUR_URL`** (e.g.
  `https://guppy.tail72863e.ts.net/shelf`). If unset, exits non-zero with a
  clear message telling the user to set it.
- Command mapping:
  - `tenfour [--label X] "text"` / stdin (`-`) → `POST /shelf`
  - `tenfour list` → `GET /shelf` (same printed format as today)
  - `tenfour clear` → `DELETE /shelf`
  - `tenfour --version` → unchanged (local)
- Keeps existing flag parsing (`--label`/`-l`, `-`/`--stdin`, TTY-stdin guard).
- Network/HTTP failure → clear stderr message, non-zero exit, so the
  `shelf-push` Stop hook surfaces it.
- Uses Node's built-in `fetch` (Node 18+; Guppy runs Node 22). No new deps.

### Raycast extension (`src/ten-four.tsx`)

- Drops `watchFile`/local persistence.
- Adds a **"Shelf URL"** preference (extension preferences, `type: textfield`).
- Polls `GET <url>` on an interval (~1s) for near-live updates, matching the old
  400ms-watch feel without hammering.
- Pin/remove/clear call `PATCH`/`DELETE` and then refresh.
- On fetch failure: show a Failure toast ("Can't reach shelf") and **retain the
  last-known list** rather than blanking it.
- `src/install-cli.tsx`: update the post-install guidance to mention setting
  `TENFOUR_URL` so the CLI knows where the shelf lives.

## Data flow

- **Push:** CLI/hook → `POST /shelf` → server appends, truncates, writes file,
  returns the item → CLI prints `📋 10-4, added to shelf: <label>`.
- **Read:** extension polls `GET /shelf` → renders. Pin/remove/clear are
  optimistic-after-confirm: call API, then re-fetch.

## Error handling

| Failure | Behavior |
|---------|----------|
| `TENFOUR_URL` unset (CLI) | stderr message + exit 1 |
| CLI can't reach service | stderr message + exit 1 (hook surfaces it) |
| `POST` empty text | `400`, CLI prints the error |
| Server file write fails | `500` with message; client surfaces it |
| Extension can't reach service | Failure toast; keep last-known list |
| Corrupt/missing store file | treated as empty `[]` (server-side) |

## Testing

- **Server:** Node test script against a temp `TENFOUR_FILE`, covering each
  endpoint plus `MAX_ITEMS` truncation and pinned-retention. Runnable with no
  network (loopback only).
- **CLI:** smoke test against a locally-run server instance (add → list → clear).
- **Extension:** manual via Raycast dev against the live Guppy `/shelf` path.

## Deployment (two hosts)

Raycast runs only on the Mac, and a Raycast extension loads from a local
checkout — so the Mac needs the extension *source*, which it gets from GitHub
(`github.com/berwickgeek/ten-four`), the same origin Guppy uses. **git is the
transport; no files are copied Guppy→Mac directly.** Both hosts check out the
same repo and run different parts of it.

### Guppy (runs the server + CLI)

- `git pull` the repo (already checked out at `~/code/ten-four`).
- Run `server/` as a `systemd` unit on `127.0.0.1:7801`.
- Expose it: `tailscale serve` maps `/shelf` → `127.0.0.1:7801`.
- CLI/hook use `TENFOUR_URL=https://guppy.tail72863e.ts.net/shelf`.

### Mac (runs Raycast)

- `git clone`/`pull` the same repo.
- From the repo root: `npm install && npx ray develop` (or `ray build`, then
  import the folder into Raycast).
- Set the extension's **Shelf URL** preference to
  `https://guppy.tail72863e.ts.net/shelf`.

### Consequence

Extension development/iteration happens **on the Mac** (that is where `ray` and
Raycast live). Guppy can edit/commit the `.tsx` and the Mac pulls, but
`ray build`/`ray develop` cannot run on Guppy. The only thing the Mac fetches at
runtime is shelf JSON over HTTPS.

## Out of scope (YAGNI)

- Auth tokens / per-user shelves.
- Off-tailnet access.
- Local-file fallback / dual-mode.
- Migrating any existing `~/.ten-four.json` contents (the shelf is ephemeral).

## Documentation updates

- README "How it works" diagram and install steps switch from the local-file
  model to the service model: run the server on Guppy, expose `/shelf` via
  `tailscale serve`, set `TENFOUR_URL` for the CLI and the "Shelf URL"
  preference in Raycast.
