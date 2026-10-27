# Architecture

```
Raycast command
  │  React (List / Detail / Form)
  ▼
src/lib/api.ts            typed action wrappers (one function per protocol action)
  ▼
src/lib/control.ts        Unix socket client: token, envelope, framing, errors
  ▼
~/Library/Application Support/ProxyManager/control.sock
  ▼
ProxyManager → IntegrationRouter → AppModel
```

## Modules

| Path | Responsibility |
|---|---|
| `src/lib/control.ts` | The only place that touches the socket. Reads the token, frames JSON, maps transport failures to `ProxyManagerError`. |
| `src/lib/api.ts` | One function per action, with the right timeout (`policy` for mutations). No UI. |
| `src/lib/host.ts` | Pure host/pattern normalisation, mirrored from the app's validator. No imports, so `bun test` can run it. |
| `src/lib/context.ts` | The local context: frontmost app, active browser tab, clipboard. Every reader is guarded and returns `null` instead of prompting. |
| `src/lib/dashboard.ts` | The hub's single load: status + targets + presets + context, with a `Cache` snapshot for an instant second open. |
| `src/lib/app-mode.ts` | "Route this app the way I mean": upsert a BUNDLE rule, enable per-app routing if needed, and the tunnel ↔ direct primary action. |
| `src/lib/presentation.ts` | State → label, icon, colour, mode names. Keeps copy out of the components. |
| `src/lib/navigation.ts` | "Show this in the app": socket `ui.open` first, `proxymanager://` URL scheme as the fallback. |
| `src/lib/toast.ts` | Failure toasts that carry the one action which unblocks the user. |
| `src/components/` | `TargetForm` (shared by the hub push and the `add-target` command), `ConnectionError` (one empty state for both "closed" and "control off"), `AppPicker`, `AppModePrimary` / `AppModeSection`. |

## Two invariants

**The socket is optional.** Every screen must render something useful when the
socket is gone (app quit, external control off, wrong support folder). Both
causes end in `Dashboard.kind === "unavailable"` and a `ConnectionError` whose
primary action is the fix for that cause — never a dead end.

**The app is the source of truth.** The extension keeps no state of its own. It
reads before it shows, mutates through one action, and re-reads. The only cache
is a serialised `Dashboard` used as `initialData`, so the first frame is not
empty; it is always replaced by a live read. **Context rows are never cached** —
a stale "the tab you're on" or "the app in front of you" is worse than a row that
appears 30 ms later.

## Performance

- One round trip set on open — `status` first (it can raise the consent sheet),
  then the reads and the local context in parallel — not one call per row.
- `Cache` gives an instant paint on the second open; `keepPreviousData` avoids a
  flash while revalidating.
- Mutations are single calls; the list revalidates with the same batched loader.
- Nothing runs while no command is open. The browser-tab read happens once per
  open, only when the browser extension is installed.
- The socket client destroys the connection as soon as a full frame arrives.

## Errors

Transport failures become `ProxyManagerError` with a stable `code`:

- `not_running` — `ENOENT`/`ECONNREFUSED`/`ECONNRESET` on the socket, or a missing
  token file. The UI offers "Open Proxy Manager".
- `timeout` — no reply in 10 s (reads) / 30 s (policy, which can wait on the
  consent sheet).
- everything else comes straight from the app (`invalid_argument`, `conflict`, …)
  and is surfaced with its `message` and a hint for the code.

`hint` is the user-facing sentence; `message` is the app's detail. Toasts show the
hint, "Copy Error" shows the raw message.

## Compatibility

The extension is built with `@raycast/api` 1.104 so it runs on **Raycast 1.x**
and on Raycast 2, which still runs 1.x extensions. The runtime is Node 22.
See `docs/raycast-versions.md` for the exact surface that is off-limits (the
APIs added in 2.0) and the one-time checks to run against both apps.
