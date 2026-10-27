# AGENTS.md — Proxy Manager for Raycast

Guidance for agents (and humans) working on this repository. **Read this file
first, then the doc for the area you are touching, then the code.**

## What this is

A Raycast extension that controls
[ProxyManager](https://github.com/chaim-chv/proxy-manager) — the macOS menu-bar
app that routes an allow-list of hosts through a SOCKS5 tunnel.
The extension is a **client**: it speaks ProxyManager's control protocol over a
Unix socket and owns no state.

Five commands, each with exactly one job. The map is a contract — read
[docs/ux.md](docs/ux.md) before adding, renaming or merging a command.

| Command | Mode | File | Context it uses |
|---|---|---|---|
| Proxy Manager (hub) | `view` | `src/index.tsx` | routing state, active tab, frontmost app, clipboard |
| Toggle Routing | `no-view` | `src/toggle-routing.ts` | — |
| Add Target | `view` | `src/add-target.tsx` | `host` argument → active tab → clipboard |
| Explain Host Routing | `view` | `src/explain-host.tsx` | `host` argument → active tab → clipboard, plus the frontmost app |
| App Routing | `view` | `src/app-routing.tsx` | frontmost app |

## Hard requirements

1. **One command per job, no duplicates.** If the hub can do it with a push, it is
   not a command. Anything that would answer the same question as an existing
   row is a design regression.
2. **No dead ends.** Every view must render a useful action when the socket is
   missing (app closed, external control off, wrong support folder). The
   `ConnectionError` empty state is the only sanctioned shape for that.
3. **No polling.** No `interval`, no timers, no background commands. Read on open,
   read after a mutation. Idle cost must be zero.
4. **The app is the source of truth.** Never infer routing state from config
   files or from your own cache. The `Cache` copy exists only as `initialData`.
5. **Never surprise the user with a side effect.** `Toggle Routing` must not
   launch the app and then toggle — a fresh launch can restore the previous
   state, so the toggle would undo the user's intent. Offer "Open Proxy Manager"
   instead.
6. **Mutations are single calls.** Never batch-compose several policy actions
   into one gesture; each one can trigger `networksetup` and is rate-limited.
7. **Copy is calm and specific.** States, not verbs; no "Successfully"; a failure
   says what to do next. `ProxyManagerError.hint` is the one place that maps
   error codes to sentences.
8. **Raycast 1.x support is a feature.** The dependency is `@raycast/api` 2.9.0,
   but the *code* must stay inside the API that 1.104 also has, or Raycast 1
   breaks at runtime. See [docs/raycast-versions.md](docs/raycast-versions.md)
   for the forbidden-API table; do not add one of those without dropping v1
   support on purpose.
9. **Context is a bonus, never a dependency.** The frontmost app, the active tab
   and the clipboard are all optional: each reader in `src/lib/context.ts` is
   guarded and returns `null`. A missing browser extension, a denied API or an
   empty clipboard must only remove a row — never fail a command, and never
   prompt. `environment.canAccess(BrowserExtension)` is checked before the
   browser API is touched, because calling it cold asks the user to install the
   extension.
10. **Context is read once per open and never cached.** A stale "the tab you're
    on" is a lie; `readDashboardCache()` deliberately blanks `site`, `app` and
    `suggestion`.
11. **The extension makes no network requests.** That is why the site row uses
    `Icon.Globe` instead of the tab's favicon. Do not add remote images, fonts or
    telemetry without changing the README's security section.

## Commands

```bash
bun install            # once; requires Node 22.22.2+
bun run dev            # watcher + import into Raycast
bun run build          # compile + type check into dist/
bun run typecheck      # tsc --noEmit
bun test               # pure logic tests, no Raycast runtime
bun run lint           # ray lint: manifest, icon, ESLint, Prettier
bun run lint:code      # ESLint + Prettier only (what CI runs)
bun run fix-lint       # ray lint --fix
```

`ray lint` resolves the manifest `author` against the Raycast Store; it fails
until that handle is registered there. CI runs `lint:code` instead so a fork
without a Store account still has a meaningful check.

There is no test runner beyond `bun test`, and `tests/` must stay free of
`@raycast/api` imports so it runs outside the Raycast runtime.

## Repo layout

```
src/
  index.tsx                 hub: state, Right Now (site + app), targets
  toggle-routing.ts         no-view hotkey path
  add-target.tsx            command wrapper around components/target-form
  explain-host.tsx          argument → active tab → clipboard → form → Detail
  app-routing.tsx           per-app rules, frontmost app first
  components/
    target-form.tsx         the single add/edit form (hub pushes it too)
    connection-error.tsx    the single "no control socket" empty state
    app-picker.tsx          installed-app picker instead of typing a bundle ID
    app-mode-actions.tsx    AppModePrimary + AppModeSection, shared by hub and rules
  lib/
    control.ts              socket client; the only place that frames a request
    api.ts                  one function per protocol action
    host.ts                 pure host/pattern normalisation (tested)
    context.ts              frontmost app, active tab, clipboard — all optional
    dashboard.ts            batched load + Cache snapshot + app-running probe
    app-mode.ts             the "route this app" upsert and its primary action
    presentation.ts         state → label/icon/colour, mode names
    navigation.ts           "show this in the app" (socket ui.open → URL scheme)
    toast.ts                failure toast with the unblocking action
tests/                      bun tests for lib/host.ts
docs/                       protocol, UX contract, architecture, Raycast versions,
                            Store submission
metadata/                   Store screenshots (2000×1250)
.agents/skills/             skills for agents working here
CHANGELOG.md                version history the Store shows
scripts/make-icon.swift     derives the extension icon from the app icon
scripts/compose-screenshot.swift  composes a window capture onto the Store canvas
```

## Conventions

- **TypeScript, strict, no `any` that survives review.** `noUncheckedIndexedAccess`
  is on; index lookups return `T | undefined`.
- **`type` aliases for form values**, never `interface`: `Action.SubmitForm<T>`
  constrains `T extends Form.Values`, and interfaces do not get the implicit
  index signature.
- **`@types/react` must stay at the exact version in `package.json`.** It is a
  peer dependency of `@raycast/api`; a mismatch makes every JSX element fail to
  type-check with `ReactNode | Promise<ReactNode>` errors.
- **Keep `lib/host.ts` dependency-free.** It is the only unit-tested module.
- **No comments that restate the code.** Comment the invariant, e.g. why the
  toggle refuses to launch the app.
- **Icons and colours come from `lib/presentation.ts`** so the same state never
  renders two ways.
- **Preferences are optional with working defaults.** No required preference
  means no setup form and no `help.md` (a 2.0-only file).
- **Copy uses typographic quotes in prose, straight quotes in code.**

## Working with ProxyManager

- Source of truth for the protocol: ProxyManager's `Sources/Integration/`, plus
  [docs/control-protocol.md](docs/control-protocol.md) here.
- The app validates target patterns; `src/lib/host.ts` mirrors that validation so
  the form fails before a round trip. If the app's rules change, change both.
- The socket and token exist only while the app runs with external control on.
  `control.token` is regenerated on every app launch — read it per call, never
  cache it.
- First call from this extension shows ProxyManager's consent sheet, which can
  block the reply for a while. That is why policy calls use a 30 s timeout and
  reads use 10 s.
- `docs/integration.md` in the ProxyManager repo is the app-side companion to
  `docs/control-protocol.md` here.

## Definition of done

- [ ] `bun run lint:code`, `bun run typecheck`, `bun test`, `bun run build` all pass
      (`bun run lint` too once the Store author handle resolves).
- [ ] Each changed command renders in all of its states: app running + off, on,
      degraded; app closed; control off.
- [ ] No new command duplicates an existing row or action ([docs/ux.md](docs/ux.md)).
- [ ] Copy follows the rules above; no error is swallowed without a hint.
- [ ] `docs/ux.md` and `docs/control-protocol.md` updated if behaviour changed.
- [ ] Raycast 1.x compatibility kept ([docs/raycast-versions.md](docs/raycast-versions.md)).

## Releases

A Raycast extension has no `version` field in its manifest, so a release is a
git tag. Use annotated tags and keep the numbering aligned with ProxyManager's
(`v0.0.x` while both are pre-1.0); `v0.0.1` is the first working build.

```bash
git tag -a v0.0.2 -m "v0.0.2 — what changed"
```

A **Store** release is different: it is a pull request to `raycast/extensions`
(`bunx ray publish`), reviewed and merged there. The checklist, the naming rules
and the two open blockers (Raycast account handle, API major) live in
[docs/store-submission.md](docs/store-submission.md). `CHANGELOG.md` is the
version history the Store shows, so update it in the same commit as the change.

## Skills

`.agents/skills/raycast-extension/` — how Raycast extensions work (manifest,
List/Detail/Form, hooks, performance, build/debug). The upstream references in
its `references/` folder describe API ≤ 2.8; read
`references/raycast-v1-support.md` in that folder first for what this repo may
not use.

`.agents/skills/proxymanager-control/` — this project's protocol, state model and
UX contract.
