# Workflows

The operational runbook: how to clone this, work on it, verify it, and ship it.
If you are picking the project up cold, start here.

- [1. First-time setup](#1-first-time-setup)
- [2. The daily loop](#2-the-daily-loop)
- [3. Verification: what to run, when](#3-verification-what-to-run-when)
- [4. CI](#4-ci)
- [5. Releasing to GitHub](#5-releasing-to-github)
- [6. Publishing to the Raycast Store](#6-publishing-to-the-raycast-store)
- [7. Screenshots](#7-screenshots)
- [8. Troubleshooting](#8-troubleshooting)
- [9. Common tasks](#9-common-tasks)

---

## 1. First-time setup

```sh
git clone https://github.com/chiptoma/sidecar-display.git
cd sidecar-display
nvm use          # Node 22 (see .nvmrc); or just use Node >=22
npm install
npm run dev      # imports into Raycast and hot-reloads
```

**Prerequisites**

| Need | Why | Check |
| --- | --- | --- |
| **Node 22** | matches CI | `node -v` |
| **Raycast** | the host app | — |
| **Full Xcode** | compiles the native engine's Swift (Command Line Tools are NOT enough) | `xcodebuild -version` |
| **BetterDisplay** *(optional)* | the BetterDisplay engine + hardware tests | `betterdisplaycli version` |
| **An iPad** *(optional)* | hardware tests only | — |

The first `npm run dev` is slow: SwiftPM fetches `extensions-swift-tools` and
builds its macros. Later runs are fast.

## 2. The daily loop

1. `npm run dev` — leave it running; it hot-reloads on save.
2. Edit. Command entry points are thin; logic lives in `src/lib/`.
3. `npm run lint` / `npm run lint:fix` as you go.
4. `npm run test:unit` before you commit — it is fast and needs no hardware.
5. Commit (Conventional Commits — see [CONTRIBUTING](../CONTRIBUTING.md#commits)).

Stopping `npm run dev` leaves the extension installed in Raycast. Use
`npm run build` to compile and type-check **without** importing.

### Where things live

| You want to change… | Go to |
| --- | --- |
| What a command does at the edges (toasts, HUDs) | `src/<command>.ts` |
| Connect / disconnect / mode logic | `src/lib/sidecar.ts` |
| Auto-reconnect timing/decisions | `src/lib/keepalive.ts` |
| The BetterDisplay engine | `src/lib/betterdisplay.ts` |
| The native engine (TS side) | `src/lib/native.ts` |
| The native engine (Swift side) | `swift/Sources/Sidecar/` |
| The mirror fix | `src/lib/virtualscreens.ts` |
| Preferences / defaults | `package.json` → then `src/lib/preferences.ts` |
| Menu bar | `src/sidecar-status.tsx` |

Adding a preference: add it to `package.json`, run `npm run build` (regenerates
the `Preferences` type), then read it in `src/lib/preferences.ts`. Never
hand-declare the preference shape.

## 3. Verification: what to run, when

```sh
npm run verify        # lint + build + test:unit — the one to run before committing
```

Individually:

```sh
npm run lint          # ESLint + Prettier, via `ray lint`
npm run lint:fix      # ...and fix what it can
npm run typecheck     # tsc --noEmit, src and tests  (also runs inside `build`)
npm run build         # ray build (compiles Swift, generates types) + typecheck
npm test              # alias for test:unit
npm run test:unit     # hardware-free: keep-alive, orchestration, mirror fix
npm run test:safety   # + absent-device guard   (needs BetterDisplay, no iPad)
npm run test:hardware # + full lifecycle        (needs BetterDisplay AND an iPad)
npm run clean         # delete every build artifact
```

Naming: `<verb>` for the primary action, `<verb>:<qualifier>` for variants
(`lint`/`lint:fix`, `build`/`build:test`, `test`/`test:unit`). `build:test`
compiles the tests and the `@raycast/api`-free modules they import, via
`tsconfig.test.json`, into `.test-build/` — it is a build step, not a test. The
`test:*` scripts run it first, so there is never a stale-build trap.

| After changing… | Run at least |
| --- | --- |
| anything | `lint` + `build` + `test:unit` |
| `sidecar.ts` / `virtualscreens.ts` (safety-critical) | `+ test:safety` |
| an engine, or before a release | `+ test:hardware` |
| the Swift helper | `+ test:hardware` with **Engine = Native** |

> **Why `typecheck` is separate:** `ray build` bundles with esbuild, which does
> **not** type-check. `tsc --noEmit` is wired into `build` and CI so a type error
> actually fails. Do not remove it.

### Testing the native engine by hand

The native engine is validated on hardware, not in CI. To test it:

1. Raycast → Sidecar Display preferences → **Engine = `Native (no dependency)`**.
2. iPad disconnected → run **Connect Sidecar** → expect it to attach and extend.
3. Menu bar → **Mirror**, **Extend**, **Disconnect** — each shows a HUD.
4. Set **Engine** back to `Automatic`.

Failures surface as `native <action> failed: <detail>`.

## 4. CI

### Branching

**Everything lives on `main`.** There is no develop branch: the Store PR is
opened from your working tree, so `main` should always be submittable. Use a
short-lived branch for anything risky (especially display-touching code) and
open a PR — that is where the CI gate earns its keep.

`main` is protected by a ruleset: **force-pushes (`non_fast_forward`) and
deletion are blocked**. Ordinary pushes are unaffected, so solo work stays
frictionless.

> CI is deliberately **not** a required status check on `main`. A required check
> on the branch itself blocks *every* direct push — the check cannot run until
> the commit is on the remote, and the commit cannot land until the check passes.
> CI still runs on every push and PR; treat a red run as a stop sign, not a lock.

### The pipeline

`.github/workflows/ci.yml` — runs on every push and PR to `main`, on
`macos-latest` (macOS is required: it compiles the Swift package).

| Step | Command |
| --- | --- |
| Lint | `npm run lint` |
| Build + type-check | `npm run build` |
| Unit tests | `npm run test:unit` |

It also caches SwiftPM and cancels superseded runs per ref. Expect ~3 minutes
(most of it Swift compilation).

**CI does not run the safety or hardware suites** — they need BetterDisplay and
an iPad, which hosted runners do not have. Run those locally before a release;
`npm run preflight` asks you to confirm you did.

### Dependencies

Dependabot opens weekly npm and GitHub Actions PRs (`.github/dependabot.yml`).
Keeping `@raycast/api` current is a Store requirement, not just hygiene. **Swift
dependencies are not covered** — bump `swift/Package.swift` by hand and commit
the regenerated `swift/Package.resolved`.

Two dependencies are deliberately held below their latest release. Both are
ignored in `dependabot.yml` at exactly the bound below — nothing usable is
hidden, so a version that *can* move still shows up as a PR.

| Dependency | Held at | Why |
| --- | --- | --- |
| `typescript` | `~6.0.3` | `@raycast/eslint-config` peer-requires `>=4.8.4 <6.1.0`. 6.1+ and all of 7.x fail to install (`ERESOLVE`). The tilde matters: `^6.0.3` would allow 6.1.0 and break the day it ships. Drop the pin when Raycast widens that peer. |
| `@types/node` | `22.x` | `@raycast/api` declares `engines: node >=22.22.2`. Types must match the runtime — newer ones describe APIs that are not there, so `tsc` would accept code that crashes inside Raycast. Bump this only alongside `.nvmrc` and the CI `node-version`. |

TypeScript 6 needs `"types": ["node"]` in `tsconfig.json`: it no longer
auto-includes every `@types` package, so without that line `@types/node`
silently vanishes and every `node:` import fails to resolve.

### Every gate, in one place

| Gate | Where | Catches |
| --- | --- | --- |
| `lint` | local + CI | style, the size/typing limits |
| `typecheck` | inside `build`, local + CI | type errors esbuild ignores |
| `test:unit` | local + CI | safety invariants, keep-alive logic, the mirror fix |
| `test:safety` / `test:hardware` | local only | real-hardware behaviour |
| ruleset | GitHub | force-push, branch deletion |
| `preflight` | inside `publish` | bad screenshots/icon, missing changelog entry, dirty tree, unrun hardware tests |
| `prepublishOnly` | npm | a stray `npm publish` firing the Store script |

## 5. Versioning and releasing

**Raycast extensions have no version number.** There is deliberately no
`version` in `package.json` — the Store versions the extension by what is
merged, and your user-visible "version" is the **CHANGELOG entry title**.

Git tags are therefore for *this repo only*: they mark what you submitted and
give you a rollback point. `.github/workflows/release.yml` cuts a GitHub Release
from a `v*` tag with auto-generated notes:

```sh
git tag v1.0.0
git push --tags
```

This is independent of the Raycast Store — a tag publishes nothing to Raycast.

## 6. Publishing to the Raycast Store

The public store has **no headless/CI publish** — every version goes in as a
**pull request to [`raycast/extensions`](https://github.com/raycast/extensions)**
reviewed by a human. All store extensions are free, open-source, MIT.

**Checklist**

1. `CHANGELOG.md` has an entry titled `## [Something] - {PR_MERGE_DATE}`
   (Raycast fills the date on merge).
2. `metadata/` has 2000×1250 PNG screenshots (see [§7](#7-screenshots)).
3. `package.json`: `author` is the **Raycast username** (`chiptoma`),
   `license` is `MIT`, `@raycast/api` is current, `categories` is Title Case.
4. Hardware suites pass locally, both engines sanity-checked.
5. Run it:

```sh
npm run publish   # store:check + preflight, then opens the store PR
```

`preflight` (`scripts/preflight.js`) hard-fails the publish unless the icon is
512×512, the screenshots are 2000×1250 (3–6 of them), `CHANGELOG.md` has a
`{PR_MERGE_DATE}` entry, and the tree is clean — then asks you to confirm the
hardware suites passed, since CI cannot. Run it alone with `npm run preflight`.

It then authenticates with GitHub and opens/updates the PR for you.

**After submitting**

- First reviewer contact is typically within a week.
- The PR goes **stale after 14 days** of inactivity and is **closed at 21** —
  keep it moving; closed PRs can be reopened.
- If collaborators push to the PR, run
  `npx @raycast/api@latest pull-contributions` before re-publishing.

**Known review risk:** the native engine uses a private Apple framework
(`SidecarCore` via `dlopen`). Precedent exists (the `punto` extension uses
private Carbon APIs), and shipping auditable Swift **source** is what Raycast
wants instead of a committed binary. If a reviewer objects, the fallback is to
ship BetterDisplay-only for v1 and reintroduce native later.

## 7. Screenshots

Store spec: **2000×1250 PNG, 16:10, max 6** (≥3 recommended), in `metadata/`.

**Raycast's Capture Window** produces this exactly — but note two gotchas:

- It only appears once you **assign it a hotkey** (Raycast Settings → Extensions
  → search "Capture Window" → Record Hotkey).
- It captures **only Raycast's main window** — not Settings, not the menu-bar
  dropdown. Those must be shot another way.

For anything Capture Window can't do, shoot it with any tool and convert:

```sh
# Landscape source -> crop-to-fill (no distortion, no padding)
magick in.png -resize 2000x1250^ -gravity center -extent 2000x1250 out.png

# Portrait/small source (e.g. the menu) -> composite on a gradient
magick -size 2000x1250 gradient:'#484070-#9A5C7E' /tmp/bg.png
magick menu.png -filter Lanczos -resize 245% /tmp/fg.png
magick /tmp/fg.png \( +clone -background black -shadow 55x35+0+14 \) +swap \
  -background none -layers merge +repage /tmp/fg_sh.png
magick /tmp/bg.png /tmp/fg_sh.png -gravity center -composite out.png
```

Verify: `sips -g pixelWidth -g pixelHeight metadata/*.png`

## 8. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `failed to import Swift package` on build | The Swift failed to compile but `ray` masks the error. Run `cd swift && swift build` to see the real diagnostics. |
| `@objc attribute used without importing module 'Foundation'` | A file using the `@raycast` macro must `import Foundation` — the expansion needs it. |
| Swift build is stuck/weird | `rm -rf swift/.raycast-swift-build swift/.build` and rebuild. |
| `tsc` can't find `swift:../../swift` | Run `npm run build` once — `ray build` regenerates `raycast-env.d.ts`, which declares the module. |
| `Cannot find name 'Preferences'` | Same: `raycast-env.d.ts` is generated by `ray build` and gitignored. |
| `betterdisplaycli … failed: … Failed.` | BetterDisplay rejected the request (often: already in that state, or the app isn't running). Reads treat this as absent; writes throw. |
| `native <action> failed: …` | The Swift helper threw. A macOS update may have changed the private SidecarCore selectors — switch Engine to BetterDisplay and patch `SidecarBridge.swift`. |
| Windows scrambled / display chaos | Use BetterDisplay's "Reconnect virtual displays". Then check what wrote a display — see the invariants in [CLAUDE.md](../CLAUDE.md#invariants--never-break-these). |
| Menu bar item missing | It is a menu-bar command; check it's enabled in Raycast, and that Background Refresh is set how you expect. |

## 9. Common tasks

**Add a command**

1. Add it to `commands` in `package.json` (`name` must match the file:
   `src/<name>.ts`; kebab-case).
2. Create the thin entry point; put logic in `src/lib/`.
3. `npm run build` regenerates types; document it in the README table.

> Command `name` is a **stable identifier** — users' hotkeys and aliases bind to
> it. Rename freely *before* the store release; after, a rename is a breaking
> change.

**Add an engine**

Implement `SidecarBackend` (`src/lib/backend.ts`), wire it into `getBackend()`
in `src/lib/preferences.ts`, add the option to the `backend` preference in
`package.json`. The orchestration needs no changes — that is the point of the
interface.

**Change auto-reconnect behaviour**

`src/lib/keepalive.ts` is pure. Change `decideKeepAlive`, add a case to
`test/keepalive.test.ts`, run `npm run test:unit`. No hardware needed.
