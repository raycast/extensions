# Philosophy

## What this is

The Memos extension is the official Memos client for Raycast, maintained in
[`usememos/raycast-extension`](https://github.com/usememos/raycast-extension)
and published to the Raycast Store.

## What it values

**Your instance, your data.** Requests go only to the Memos instance
configured in preferences. Nothing is copied elsewhere — no analytics
endpoint, no third-party relay, no local database that outlives the request.

**Settings belong to Raycast.** The instance URL and the access token live in
Raycast's own preferences store, encrypted, and everything about them can be
edited from Raycast Settings → Extensions → Memos. The extension never keeps
its own copy in `LocalStorage`, a file, or code.

**Errors are for humans.** Every failure names the instance and the fix —
`https://memos.example.com rejected the access token. Create a new one at
…` — never a bare `Request failed` or a raw stack trace.

**Fast paths first.** Commands are keyboard-first and each does one thing:
open one, get one result, act on it, close it. No command tries to be a
dashboard.

**Tools enforce style.** `ray lint` and strict TypeScript catch style and
type mistakes before a human has to. Nobody argues about formatting in
review.

**Code explains itself.** Good names and small, single-purpose functions
carry the meaning. A comment is reserved for a _why_ the code genuinely can't
show.

**Fail at setup, not mid-capture.** The Setup command checks the connection —
reachability, token, response shape — before any other command depends on it
working. Finding out your token is stale while trying to save a memo is the
failure mode this extension is built to avoid.

## What it is not

- **Not a replacement for the Memos web app.** It's a fast way to capture and
  find memos without leaving Raycast, not a full editor or admin console.
- **Not an offline client.** Every command talks to your instance live; there
  is no local cache that survives past `@raycast/utils`'s own caching.
- **Not tied to one Memos host.** It works against whatever instance you
  point it at — the public demo, a self-hosted server, anything running the
  Memos API.
