# The desktop session index

One JSON object per session, at
`<profile>/claude-code-sessions/<account>/<org>/local_<uuid>.json`.

The schema is undocumented and gains fields between app versions, so `import`
resolves fields by rule rather than from a fixed list. `claude-profiles inspect`
prints the shape of a live entry.

## Field policy

| Class | Source | Examples |
| --- | --- | --- |
| `DERIVED` | read from the transcript | identity, timestamps, title, model, turn count |
| `PERMISSION` | your own application default, else the most conservative attested value | `permissionMode`, `chromePermissionMode` |
| `NEUTRAL` | forced empty or false | per-session grants, run state, connector cache |
| `DROPPED` | omitted entirely | `error`, `errorAt`, `priorErrorMark` |
| `APP_TRUTH` | copied from a template entry the app wrote | everything else |

`APP_TRUTH` is the default for any unrecognised field, so a field added by a
future app version carries through with the app's own value rather than being
dropped or guessed at.

## Permissions

| Field | Value | Source |
| --- | --- | --- |
| `permissionMode` | your setting | `~/.claude/settings.json` → `permissions.defaultMode` |
| `chromePermissionMode` | `always_ask` | conservative; no global setting exists |

Per-session grants (`alwaysAllowedReasons`, `sessionPermissionUpdates`,
`bridgeSessionIds`, and similar) are always reset to empty, so approvals given to
one session never ride along to another.

`tools/permission-audit.sh` recovers the valid enum values from the app bundle.
Re-run it after an app update before trusting a large import.

Confirmed against app.asar: `chromePermissionMode` admits
`skip_all_permission_checks` and `always_ask`; `permissionMode` is currently
assigned `ask`, `default`, or `acceptEdits`, with `auto`, `plan`,
`bypassPermissions`, and `dontAsk` present as further literals. `import` falls
back to `ask` and `always_ask` when no default is set.

## Stale run state

`error`, `errorAt` and `priorErrorMark` record something that happened to the
*template* session, usually a rate limit, and the app shows an error badge for
them. Copied as `APP_TRUTH` they put that badge on every generated session, so
they are dropped rather than emptied — an entry with no error omits these keys.

`claude-profiles optimize --clear-errors` removes them from entries that already
carry one.

## Connector cache

`remoteMcpServersConfig` caches the remote MCP servers available when the entry
was written, around 90 KB once a connector with many tools is attached. It does
not follow a later disconnect, so a copied one names a connector the account may
no longer have. The live list is account-side, so this is a cache, not a source
of truth, and a generated entry starts empty.

## Working directories

A session's folder appears in an entry more than once. Alongside top-level `cwd`
and `originCwd`, `promptAppendSnapshot` embeds its own `cwd`, and that field is
`APP_TRUTH` — copying it verbatim gave every generated session the *template*
session's folder. Any key named `cwd` or `originCwd` is therefore retargeted at
any depth, and every run verifies afterwards that no working-directory value in
a written entry disagrees with the session's own.

The folder itself is the launch directory, the first `cwd` the transcript
records. Later values are subdirectories the run stepped into, so taking the
most common value would pick a subdirectory whenever a run worked mostly below
its root. Entries the app writes always set `cwd == originCwd`.
