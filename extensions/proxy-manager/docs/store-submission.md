# Publishing to the Raycast Store

How submissions actually work, and what this repo still needs. Source of truth:
`docs/basics/publish-an-extension.md` and
`docs/basics/prepare-an-extension-for-store.md` in
[raycast/extensions](https://github.com/raycast/extensions), plus the
[Extension Guidelines](https://manual.raycast.com/extensions-guidelines).

## The flow

1. A Raycast Store submission is a **pull request to `raycast/extensions`**, not a
   package upload. The CLI copies this folder into `extensions/<manifest name>/`
   and opens the PR for you:

   ```bash
   npx @raycast/api@latest publish   # or: bunx ray publish
   ```

   It needs GitHub auth, squashes your commits into one, and can be re-run to push
   more commits to the same PR.

2. If you prefer to control the diff, fork `raycast/extensions`, copy this folder
   to `extensions/proxy-manager/` (the folder name must equal `name` in
   `package.json`), and open the PR by hand.

3. Review happens on that PR. Automated GitHub checks run the same lint and build
   you run locally. Once it merges, the extension is published to
   raycast.com/store automatically — there is no separate "release" step.

4. Subsequent updates are another `publish` run. If a maintainer or contributor
   edited the copy in `raycast/extensions`, pull those changes back first with
   `npx @raycast/api@latest pull-contributions`.

## Required in the PR

| Requirement | Where | This repo |
|---|---|---|
| `author` = your **Raycast account username** | `package.json` | ✅ `chaim-chv` resolves (verified with `ray lint`), and it must stay identical to the Raycast account handle. |
| `license: "MIT"` | `package.json` | ✅ |
| Latest `@raycast/api` | `package.json` | ✅ `2.9.0` + `@raycast/utils` `2.3.3`. Verified on Raycast 1.104 as well: every command was opened with the 2.x build (see [raycast-versions.md](raycast-versions.md#why-290-still-runs-on-raycast-1--measured-not-guessed)). |
| `package-lock.json` | repo root | ✅ committed, because the Store's CI installs with npm. `bun.lock` still drives day-to-day work; regenerate the npm lock after changing dependencies with `npm install --package-lock-only`. |
| `platforms` | `package.json` | ✅ `["macOS"]` |
| 512×512 PNG icon, not the default Raycast icon | `assets/` | ✅ the ProxyManager app mark |
| `CHANGELOG.md` | repo root | ✅ |
| `README.md` when setup is needed | repo root | ✅ — users must enable Settings → Integration → Allow external control |
| 3+ screenshots, 2000×1250 PNG | `metadata/` | ✅ three: hub, App Routing, Explain Host Routing |
| No analytics, no Keychain access, no opaque binaries | — | ✅ |

## Screenshots

The three in `metadata/` are the ones that tell the story in order: what the
routing is doing, how an app is routed, and why a host is routed that way.

| File | Command | What it proves |
|---|---|---|
| `1-proxy-manager.png` | Proxy Manager | State, the frontmost app, the clipboard suggestion and the target list in one screen |
| `2-app-routing.png` | App Routing | `This App` with its effective mode, plus the rule list |
| `3-explain-host-routing.png` | Explain Host Routing | Decision, matched wildcard, app context, and the fix as the primary action |

Both are 2000×1250 PNG on the same background. To reproduce or replace one:

```bash
# 1. open the command (the deeplink argument is URL-encoded JSON)
open 'raycast://extensions/chaim-chv/proxy-manager/explain-host?arguments=%7B%22host%22%3A%22api.whatsapp.com%22%7D'

# 2. capture just the Raycast window (no shadow), then compose the canvas
screencapture -x -o -R <x,y,w,h> /tmp/window.png
swift scripts/compose-screenshot.swift /tmp/window.png metadata/3-explain-host-routing.png
```

`scripts/compose-screenshot.swift` draws the store canvas: a deep gradient, a
faint glow, and the window with a soft shadow and rounded corners. Raycast's own
**Capture Window** command (⌘⇧⌥M with *Save to Metadata*) is the alternative if
you want the desktop wallpaper behind the window instead.

Guidelines that still apply: same background for all shots, no secrets, no other
apps in frame, landscape 2000×1250.

## Naming and copy rules that reviewers enforce

- Extension and command titles follow the Apple Style Guide; commands read
  `<verb> <noun>` (`Add Target`, `Explain Host Routing`).
- Action titles are Title Case — `ray lint` enforces this via
  `@raycast/prefer-title-case`, which is why the panel says "Turn off App
  Routing" rather than "Turn Off …".
- A submenu action ends with `…` and does not repeat its own name inside.
- No custom navigation stack, no separate "configure the extension" command, no
  external analytics, no localisation layer, US English.

## What is already correct here

- `ray lint` passes end to end (manifest, icon, ESLint, Prettier, author handle).
- `bun run build` produces the distribution build the review asks for.
- Preferences are optional with working defaults, so there is no setup wall.
- The Store's "About This Extension" panel reads this repo's `README.md`, which
  explains the one-time external-control switch.

## Before you submit

```bash
bun run lint:code && bun run typecheck && bun test && bun run build
ray lint                      # passes once the author handle resolves
bunx ray publish
```
