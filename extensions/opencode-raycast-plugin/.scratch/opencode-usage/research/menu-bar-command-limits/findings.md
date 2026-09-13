# Raycast menu-bar command limits — research findings

- Ticket: `.scratch/opencode-usage/issues/01-raycast-menu-bar-command-limits.md`
- Date researched: 2026-09-08 (docs fetched live from `developers.raycast.com` on this date)
- API version at time of writing: `@raycast/api` **2.2.1** (latest on npm)
- Decision this serves: **Menu-bar surface** → the refresh-cadence constraints are the payload.

## TL;DR

| # | Question | Answer |
|---|----------|--------|
| 1 | `MenuBarExtra` + menu-bar command type? | **Yes.** `import { MenuBarExtra } from "@raycast/api"`; command `mode: "menu-bar"` in the manifest. macOS-only (not on Windows). |
| 2 | Dynamic title + icon over time? | **Yes.** `MenuBarExtra` takes `title`, `icon`, `tooltip`, `isLoading`. Both re-render on every command (re)launch. For a live percentage, pair `title` text with `getProgressIcon(0..1)` from `@raycast/utils`. |
| 3 | What drives updates / cadence? | Background refresh via the `interval` manifest property. **Hard floor: `10s`** (min supported value). No documented hard ceiling. Scheduling is approximate (macOS-tolerated); Store installs ship with background refresh **off** until the user runs the command once or enables it. A menu-bar command is *not* a long-lived process — it re-renders only when Raycast launches it (5 documented triggers, see §3). |
| 4 | Open other commands / switch to full view? | **Yes.** `launchCommand({ name, type: LaunchType.UserInitiated })` launches another command in the same extension (e.g. the full view); cross-extension launches supported since v1.49.0 (with a permission prompt). `open("raycast://extensions/…")` deeplinks also work. |
| 5 | Store review constraints for a local-file + third-party-API extension? | Extensions are **not sandboxed** for file I/O or networking, so reading `~/.local/share/opencode/auth.json` is fine. Store submission requires: `npm run build` (distribution build) + `npm run lint`, `MIT` license, real author handle, `platforms`, npm + `package-lock.json`, README if extra setup, no external analytics, no Keychain access, service-TOS compliance, and review via PR to `raycast/extensions`. A **local-only** extension needs none of the Store conventions — just `ray develop` / `ray build` locally; `mode: "menu-bar"` + `interval` work identically. |
| 6 | macOS/UX caveats? | Menu bar has limited space — **macOS has final say**; extras can silently not appear when the bar is full. **Raycast must be running** for the extra to exist (it is Raycast that renders it; items are restored from Raycast's DB on relaunch, not by re-running your code). Hover shows `tooltip`; left-click opens the menu (command stays loaded while menu is open); right-/control-click is a distinct action event type; ⌥ (option) swaps in `alternate` items (Sonoma+ only). |

---

## 1. `MenuBarExtra` component + menu-bar command type

- Yes. The docs' *Menu Bar Commands* page: "The `MenuBarExtra` component can be used to create commands which populate the extras section of macOS' menu bar."
  Source: https://developers.raycast.com/api-reference/menu-bar-commands.md
- Import: `import { MenuBarExtra } from "@raycast/api";`
- Command type is the `mode` field in the manifest (`package.json` → `commands[]`):
  - `mode: "view"` — main view in Raycast window
  - `mode: "no-view"` — no UI, headless
  - `mode: "menu-bar"` — returns a `MenuBarExtra` rendered into the macOS menu bar
  Source: https://developers.raycast.com/information/manifest.md (Command properties → `mode`)
- macOS only. "Menubar commands aren't available on Windows." (Menu Bar Commands page). The manifest `platforms` field (`"macOS"`, `"Windows"`) exists for this reason (changelog v1.103.0).
- Historical anchor: menu-bar commands + background refresh shipped as Beta in `@raycast/api` v1.38.1 (2022-07-21). Stable since. Source: https://developers.raycast.com/misc/changelog.md

## 2. Dynamic title text + changing icon

- Yes. `MenuBarExtra` props (Menu Bar Commands page API reference):
  - `title: string` — "The string that is displayed in the menu bar."
  - `icon: Image.ImageLike` — "The icon that is displayed in the menu bar." (accepts built-in `Icon`, local assets, remote URLs, or dynamically generated assets)
  - `tooltip: string` — shown on hover
  - `isLoading: boolean` — tells Raycast not to unload while work is in progress
- Any React state/async data resolved before render is reflected in both title and icon. So a live percentage is simply: fetch/read → compute percentage → `<MenuBarExtra icon={getProgressIcon(pct)} title={`${pct}%`} />`.
- **Percent icon helper:** `getProgressIcon(progress: 0..1, color?, options?)` from `@raycast/utils` returns an `Image.Asset` — purpose-built for "the progress of a task". Source: https://developers.raycast.com/utilities/icons/getprogressicon.md
- Best practice: keep the title short; long titles in `MenuBarExtra`/`Submenu`/`Item` are discouraged (Menu Bar Commands page).

## 3. What drives updates — refresh cadence (the payload)

### Mechanism

- A `menu-bar` (or `no-view`) command is scheduled to run in the background via the `interval` property on the command in the manifest:
  ```json
  { "name": "usage", "mode": "menu-bar", "interval": "10m" }
  ```
  Units: seconds (`s`), minutes (`m`), hours (`h`), days (`d`). Source: https://developers.raycast.com/information/lifecycle/background-refresh.md
- Menu-bar commands render a React component; a background run stays alive until `isLoading` is `false`. "ensure `isLoading` is set to false as early as possible" (best practices).
- `environment.launchType` distinguishes manual (`LaunchType.UserInitiated`) vs scheduled (`LaunchType.Background`) launches, so you can skip work or show different UI.

### Cadence limits

- **Hard floor: `10s`** — "The minimum value is 10 seconds (`10s`), which should be used cautiously" (background-refresh doc). Confirmed by changelog v1.42.0 (2022-10-26): "**Background Refresh:** The shortest interval available is now 10s instead of 1m (use cautiously…)".
  - ⚠️ The **manifest doc contradicts this**: its `interval` row still reads "The minimum value is 1 minute (1m)." That is stale/incorrect; the 10s floor has been live since v1.42.0. Trust the background-refresh doc + changelog. **Version-sensitive, re-verify at build time.**
- **No documented hard ceiling.** The max is not specified in any doc; scheduling is intentionally approximate.
- **Scheduling is not exact**: "The actual scheduling is not exact and might vary within a tolerance level. macOS determines the best time for running the command in order to optimize energy consumption, and scheduling times can also vary when running on battery." (background-refresh doc). Expect drift, especially on battery.
- **Overlap prevention / timeout**: "To prevent overlapping background launches of the same command, commands are terminated after a timeout that is dynamically adjusted to the interval." Commands exceeding max execution time are auto-terminated. So a slow run is killed, and the *next* tick uses the freshly killed state — keep each run fast.
- **Practical floor guidance**: the doc's best practices say "Choose the interval value as high as possible — low values mean the command will run more often and consume more energy," and to check third-party rate limits and handle errors (retry later). For a percentage readout, `10s` is technically allowed but wasteful; a `30s`–`1m` cadence is the realistic sweet spot, with a much slower fallback (e.g. `5m`) for the API call if the local file is the cheap signal.

### When exactly does a menu-bar command re-render?

Menu-bar commands are **not long-lived processes**. "Raycast loads them into memory on demand, executes their code and then tries to unload them at the next convenient time." (Menu Bar Commands page, *Lifecycle*). The five documented events:

1. **Run from root search** — loads, runs, waits for `isLoading: false`, unloads.
2. **Scheduled background run** (interval + background refresh active) — same lifecycle as #1.
3. **User clicks the icon/title in the menu bar** — if the extra has a menu, Raycast loads + executes it and **keeps it in memory while the menu is open**; it unloads when the menu closes. In-menu state updates re-render while open (v1.40.0: action handlers "will either wait or force a render after finishing execution").
4. **Raycast restart** — the item is restored **from Raycast's database**, "not by loading and executing the command." So a restart shows the *last rendered* title/icon, not freshly computed values.
5. **Re-enabled in preferences** — same as a restart.

Plus, from the changelog: menu-bar commands **auto-refresh when their or their parent extension's preferences change** (v1.40.0).

**Consequence for design:** there is no in-process timer you can rely on. Between background ticks the bar can show stale text (e.g. after a restart). Use the `Cache` API / `useCachedState` to render instantly on launch, then refresh. A manual click or `launchCommand({… type: LaunchType.Background })` can force an immediate refresh on demand.

### Activation / opt-in

- Raycast **auto-adds** background-refresh preferences (enable/disable + last-run time) for scheduled commands.
- **Store-installed commands ship with background refresh OFF** — "background refresh is initially *disabled* and is activated either when the user opens the command for the first time or enables background refresh in preferences." So the first tick is user-triggered; the menu-bar extra only appears once the command has run at least once.
- Dev/debug: root search has "Run in Background" and "Show Error" actions; the built-in "Extension Diagnostics" command lists which commands run in background and when.

Sources: https://developers.raycast.com/information/lifecycle/background-refresh.md · https://developers.raycast.com/api-reference/menu-bar-commands.md

## 4. Opening other commands / switching to the full view

- **`launchCommand`** (from `@raycast/api`): "Launches another command… Use this method if your command needs to open another command based on user interaction, or when an immediate background refresh should be triggered, for example when a command needs to update an associated menu-bar command."
  - Same extension: `launchCommand({ name: "list", type: LaunchType.UserInitiated, context: {…} })`.
  - Cross-extension: requires `extensionName` + `ownerOrAuthorName`; "the user will be presented with a permission alert."
  Source: https://developers.raycast.com/api-reference/command.md
  - Same-extension support landed v1.42.0; cross-extension v1.49.0 (changelog).
- **Deeplinks**: `raycast://extensions/<author-or-owner>/<extension-name>/<command-name>` launch any installed command; supports `launchType=background`, `arguments`, `context`, `fallbackText` query params. Open via the `open()` utility. Launching via deeplink asks the user to confirm.
  Source: https://developers.raycast.com/information/lifecycle/deeplinks.md
- So a menu-bar item → `MenuBarExtra.Item` with `onAction={() => launchCommand({ name: "usage-view", type: LaunchType.UserInitiated })}` switches to the full Raycast view of the same extension. (Changelog v1.46.0 fixed menu-bar commands launching view commands stacking the nav hierarchy.)

## 5. Store review constraints vs local-only extension

### Security / runtime model (applies to both)

- Extensions are **not sandboxed** for file I/O, networking, or Node features. "Extensions are not further sandboxed as far as policies for file I/O, networking… are concerned." Reading `~/.local/share/opencode/auth.json` is permitted without special permissions (macOS TCC only gates special dirs like Documents, and only at Raycast's level).
- "Raycast is a local-first application… generally connects to third-party APIs directly rather than proxying data through Raycast servers." A third-party API call from an extension is normal and expected.
- `~` path expansion in file-path APIs: "All the APIs that accepts a file path will now resolve `~`" (changelog v1.58.0).
Sources: https://developers.raycast.com/information/security.md · changelog

### If published to the Store (review constraints)

From *Prepare an Extension for Store*:
- **`npm run build` (distribution build) is required before submitting** — "run a distribution build with `npm run build` locally before submitting the extension for review. This will perform additional type checking and create an optimized build." `npm run lint` is also expected; both re-run via automated GitHub checks on the PR.
- Use `npm` (not other package managers); commit `package-lock.json`; use the **latest `@raycast/api`**; `MIT` license; your Raycast username as `author`; `platforms` restricted correctly.
- Provide a **README** if the extension needs setup (e.g. pointing at `~/.local/share/opencode/auth.json`).
- Check the **TOS of the third-party service** (opencode) and comply with the Extension Guidelines.
- **No external analytics.**
- **Keychain access → rejected.** (Not relevant here — you read a file, not the Keychain. Also: prefer `password`-type preferences for tokens; a personal-token preference is the store-approved alternative to hard-coding auth.)
- Extension is **open source by default** (published via PR to `github.com/raycast/extensions`; review first-in-first-out by Community Managers; stale after 14d inactivity, closed after 21d).
- UI/UX rules that would matter for a `view`-mode full screen: use Navigation API for pushing screens, don't roll your own navigation, Title Case naming, required preferences via the preferences API (don't build a custom config command).
- Categories, 512×512 PNG icon, 2000×1250 screenshots (max 6), `CHANGELOG.md` for version history.

### If local-only (not published)

- **None of the Store conventions are required.** A local extension uses the same manifest (`mode: "menu-bar"`, `interval`) and API, but:
  - `npx ray develop` for hot-reloading development; `npx ray build` for a production build; no review, no PR, no open-sourcing, no screenshots/README/CHANGELOG, no license/author/platform restrictions.
  - Local commands are marked in root search so they're distinguishable from Store commands (changelog v1.55.0).
  - Background refresh on a local command is **on by default when you run it** (the Store "disabled until first run" rule is about installed Store commands).
  - Team/private-store publishing (`owner` + `access: "private"`) is a middle option if you later want it shared without going public.
Sources: https://developers.raycast.com/basics/prepare-an-extension-for-store.md · https://developers.raycast.com/information/developer-tools/cli.md · https://manual.raycast.com/extensions-guidelines · https://developers.raycast.com/teams/publish-a-private-extension.md

## 6. macOS / UX caveats

- **Menu bar space is the hard physical limit.** "macOS has the final say on whether a given menu bar extra is displayed. If you have a lot of items there, it is possible that the command we just ran doesn't show up." Users can free space or hide items (HiddenBar, Bartender, etc.). Menubar extras may also be dimmed on inactive multi-monitor displays (changelog v1.65.0).
- **Raycast must be running.** The extra is rendered by Raycast into the macOS menu bar; the docs' lifecycle only ever shows items existing while Raycast is loaded, and on restart the item is restored from Raycast's DB. If Raycast is quit, the extra disappears. (Corollary: this is not a system-level menubar app.)
- **Hover** shows the `tooltip` prop.
- **Click behavior**: left-click opens the dropdown menu (command stays loaded in memory while the menu is open — no per-tick staleness while the user is looking at it). Clicking an `Item` with `onAction` runs the handler; handlers force a re-render after execution (v1.40.0).
- **Right-click / control-click** is a distinct event: `MenuBarExtra.ActionEvent.type` is `"left-click"` or `"right-click"` — right-clicking a menubar *item* works on macOS Sonoma+ (fixed v1.59.0). Right/control-click support for items landed v1.40.0.
- **⌥ (option) `alternate` items**: pressing ⌥ swaps in an alternate item (v1.62.0); only supported on macOS Sonoma+ (v1.63.0 — pre-Sonoma they appeared alongside their parent). Limitations: alternate may not have its own shortcut, may not nest another alternate, parent may not use ⌥ as modifier.
- **Menu bar extra can be removed without disabling the command**: drag it out of the bar while holding ⌘, or use the "Deactivate Command" action (v1.40.0).
- **Text-only extras**: a text-only extra is supported (title without icon) and had a rendering-offset bug fixed in v1.67.0; if a `title` spans multiple lines only the first line is shown (v1.41.0). Keep titles short (best practice).
- **Not available on Windows.**
- **macOS AppKit context**: menu bar extras are standard NSStatusItems — subject to Apple's HIG for menu bar commands (https://developer.apple.com/design/human-interface-guidelines/components/system-experiences/the-menu-bar).

---

## Version-sensitive facts (re-check at build time)

| Fact | As of | Risk |
|------|-------|------|
| Minimum `interval` = **10s** (was 1m before v1.42.0) | v1.42.0 (2022-10-26) | The manifest doc still says "min 1m" — doc inconsistency; trust background-refresh doc + changelog. **Re-verify before shipping.** |
| `alternate` items need **macOS Sonoma+** | v1.63.0 (2023-11-29) | If the target Mac runs pre-Sonoma, don't rely on alternates. |
| Right-click on menu-bar items fixed for Sonoma | v1.59.0 (2023-09-21) | Older macOS + older Raycast = right-click unreliable. |
| Node runtime: v22 / React 19 | v1.94.0 (2025-03-19) | `fetch` is globally available; `@raycast/api` currently 2.2.1. |
| Menu-bar commands auto-refresh on preference change | v1.40.0 (2022-09-28) | Behavior, not API — stable. |
| Menu-bar commands + background refresh (Beta→stable) | v1.38.1 (2022-07-21) | Long-stable. |
| Cross-extension `launchCommand` | v1.49.0 (2023-03-29) | Same-extension is what we need (since v1.42.0). |
| Store-installed commands: background refresh disabled by default until first run | current docs | Local commands unaffected. |

Docs were fetched 2026-09-08; changelog snapshot ends at v1.103.0 (2025-09-15) on the current docs site, but the npm `@raycast/api` latest is **2.2.1** — the dev-docs changelog may lag the npm version. Re-check the changelog page + manifest page at build time.

## Sources (official)

- https://developers.raycast.com/api-reference/menu-bar-commands.md — `MenuBarExtra` API, lifecycle, macOS caveats, best practices
- https://developers.raycast.com/information/lifecycle/background-refresh.md — scheduling, 10s minimum, tolerance, activation, preferences, best practices
- https://developers.raycast.com/information/manifest.md — command `mode` + `interval` (⚠️ stale 1m wording)
- https://developers.raycast.com/api-reference/command.md — `launchCommand`, `updateCommandMetadata`, `LaunchType`
- https://developers.raycast.com/information/lifecycle/deeplinks.md — `raycast://` deep links + query params
- https://developers.raycast.com/utilities/icons/getprogressicon.md — percent/progress icon helper
- https://developers.raycast.com/information/security.md — runtime model, no file/networking sandbox
- https://developers.raycast.com/basics/prepare-an-extension-for-store.md — Store review requirements (`npm run build`, README, no analytics, no Keychain, naming, screenshots…)
- https://developers.raycast.com/information/developer-tools/cli.md — `ray build` / `ray develop` / `ray lint` / `ray publish`
- https://developers.raycast.com/misc/changelog.md — menu-bar + background-refresh history, 10s floor, Sonoma alternates
- https://manual.raycast.com/extensions-guidelines — review process, rejection reasons
- https://developers.raycast.com/teams/publish-a-private-extension.md — private/team extension option