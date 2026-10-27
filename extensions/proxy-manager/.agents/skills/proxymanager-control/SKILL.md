---
name: proxymanager-control
description: Work on the ProxyManager Raycast extension's control layer or UI contract — the control socket client, the status/targets/presets/app-routing calls, error hints, and which command owns which action. Use when changing src/lib/control.ts, src/lib/api.ts, any command's actions or state handling, when a call fails with a protocol error, or when deciding whether a new feature belongs in this extension at all.
---

# ProxyManager control layer

This extension is a thin, typed client for ProxyManager's control protocol. The
repo contract is `AGENTS.md`; the full wire reference is
`docs/control-protocol.md`; the command map is `docs/ux.md`. This skill is the
short version plus the decisions that are easy to break.

## The one path to the app

```
component → src/lib/api.ts (one function per action)
          → src/lib/control.ts (token, envelope, framing, error mapping)
          → ~/Library/Application Support/ProxyManager/control.sock
```

Rules:

1. **Only `control.ts` opens a socket.** Components never build envelopes.
2. **Read `control.token` on every call.** It is regenerated on each app launch;
   a cached token turns every request into a silent close.
3. **Mutations use `{ policy: true }`** → 30 s timeout, because the first call may
   block on ProxyManager's consent sheet. Reads use 10 s.
4. **A frame is `uint32 BE length` + JSON**, max 256 KiB, one request per
   connection, response is `{ v, result }`. Destroy the socket as soon as the
   frame is complete.
5. **`result.changed: false` is success.** Idempotent mutations report it; never
   treat it as an error or as "nothing happened".
6. **Errors become `ProxyManagerError`** with the app's `code` (`invalid_argument`,
   `conflict`, `not_found`, `unauthorized`, …) or a transport code
   (`not_running`, `timeout`, `unavailable`, `forbidden`). The user-facing
   sentence is `hint`, not `message`. Add a case to `hint` when you add a code.
7. **Identity is a label, not auth.** `requirement: "com.proxymanager.raycast-extension"`
   is hashed into the consent key. Changing it forces a new consent prompt, so
   change it only deliberately.

## Scopes and what that means for UX

| Approved as | Works | Fails with |
|---|---|---|
| **Allow Control** | everything | — |
| **Read Only** | status, lists, explain, `ui.open`, app routing *reads* | every mutation: `unauthorized` |
| **Deny** | nothing | `unauthorized` on the first call |

The extension must stay useful under **Read Only**: reads render, mutations show a
failure toast that says to re-approve in Settings → Integration. Never require a
mutation to render a screen.

## State model

`status.state` is `off | starting | on | degraded | stopping`.

- `on` — listener up, tunnel reachable.
- `degraded` — listener up, **tunnel unreachable**. Traffic is being accepted but
  cannot be forwarded; the primary action becomes **Retry**, not Toggle.
- `starting` / `stopping` — transient; do not offer a second transition as the
  primary action.
- `routingIntended` is the user's intent and survives a degraded state. Use it to
  answer "was it ever on?", not `state`.
- `authorizationDeferred` — the system proxy could not be applied without an admin
  approval. Surface it; never retry automatically in a loop.

## The actions we expose

`routing.enable/disable/toggle/retry`, `targets.list/add/remove/update`,
`presets.list/apply`, `apps.list/setEnabled/setDefault/rule.set/rule.remove`,
`apps.resolve`, `routing.explain`, `status`, `ui.open`, `app.activate`.

**Not exposed on purpose:** the tunnel endpoint and SSH password, config
import/export, appearance, telemetry queries, system-proxy details. They are
UI-only in the app for a reason (secrets, admin prompts, and blast radius). If a
task asks for one, the answer is "not through this extension" unless the app's
protocol grows that action first.

## Patterns in this repo

```ts
// read
const [status, targets, presets] = await Promise.all([api.getStatus(), api.listTargets(), api.listPresets()]);

// mutate, then re-read; never patch local state by hand
await api.updateTarget(id, { enabled: false });
await revalidate();
await showHUD(`Disabled ${pattern}`);
```

## Context

`src/lib/context.ts` is the only place that reads the machine:

| Reader | Guard | Falls back to |
|---|---|---|
| `frontmostApp()` | ignores `com.raycast.macos`, catches rejections | no app row |
| `activeSite()` | `environment.canAccess(BrowserExtension)` first | no site row |
| `clipboardHost()` | try/catch on `Clipboard.readText()` | nothing |
| `preferredHost(arg)` | — | `arg` → tab → clipboard |

Rules:

- A context reader must never prompt, throw, or delay a command. If any of that
  would happen, return `null`.
- Never read the browser tab on a no-view hotkey path; it is context for a view.
- `apps.resolve` only sees `BUNDLE` rules, so create app rules with
  `keyKind: "BUNDLE"` — otherwise the app row will claim "no rule".
- Setting an app mode is two calls when per-app routing is off
  (`apps.setEnabled` then `apps.rule.set`); `setAppMode()` owns that sequence.

- `api.ts` returns the payload, not the envelope. Keep it that way.
- Pass only the arguments the action declares: unknown arguments are rejected,
  and `targets.remove` requires **exactly one** of `id` or `pattern`.
- `targets.add` is idempotent *and* flips `enabled` on an existing pattern; the
  response's `pattern` is what the app stored — show that, not the raw input.
- `apps.rule.set` never enables per-app routing as a side effect. If rules are
  meant to apply, set `apps.setEnabled` too and say so in the UI.
- `routing.explain` without a `bundleID` returns the **default** app mode, not the
  mode of the app that made a request. Word it "Per-app default".

## Adding or changing an action

1. Check the app's `Sources/Integration/IntegrationAction.swift` — the protocol is
   the source of truth. If the action is not there, it does not exist.
2. Add a typed wrapper in `src/lib/api.ts` and the payload type in
   `src/lib/types.ts`.
3. Map new error codes in `ProxyManagerError.hint`.
4. Decide which command owns it ([`docs/ux.md`](../../../docs/ux.md)); do not add a
   command for it.
5. Update `docs/control-protocol.md` if a payload or argument changed.
6. Run `bun run typecheck && bun test && bun run build`.

## Testing

- Pure logic (host normalisation, `isCoveredByTargets`) goes in `src/lib/host.ts` or
  another import-free module so `bun test` covers it.
- Everything else needs a real ProxyManager. Manual checks: app running / app
  closed / control off / Read Only / `off`, `on`, `degraded`; plus the first-call
  consent sheet.
- Debug with:
  `log stream --predicate 'subsystem == "com.proxymanager.app" AND category == "integration"'`
  and `tail -f ~/Library/Application\ Support/ProxyManager/integration-audit.jsonl`.

## Traps

- **Do not launch the app and toggle in one gesture.** A fresh launch can restore
  the previous routing state (`wasOnKey`), so the toggle would undo the user's
  intent. Offer "Open Proxy Manager" and stop.
- **Do not poll.** No `interval`, no timer, no socket kept open for state.
- **Do not let context become required.** A hub that fails because the browser
  extension is missing is a regression: the site row simply disappears.
- **Do not fetch the tab favicon.** The README promises no network access; use
  `Icon.Globe`.
- **One site row and one app row, maximum.** Context must not grow into a list of
  tabs or running apps — that is what Spotlight is for.
- **Do not toggle an app blindly.** With `TARGETS` in play, Enter flips tunnel ↔
  direct and the explicit modes stay in the panel (`primaryAppMode`).
- **Do not read config files** instead of the socket; the dashboard's `Cache` copy
  is only `initialData`, and it deliberately drops context.
- **Rate limits are real:** 240 reads/min, 30 mutations/min, 6 `routing.toggle`/min.
  A loop of toggles will hit `busy`.
- **`ui.open` sections** are validated by the app; the app's own list does not
  include `integration`, so "open the Integration pane" is not a thing the
  protocol can do — open Settings and name the switch in the copy.
