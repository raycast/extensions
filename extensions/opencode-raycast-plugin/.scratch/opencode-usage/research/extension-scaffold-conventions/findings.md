# Raycast extension scaffold and store conventions (2026)

Ticket: `03-raycast-extension-scaffold-conventions` (`.scratch/opencode-usage/issues/03-raycast-extension-scaffold-conventions.md`)
Goal: fix the Raycast UI layout for an "Open Code Go usage view" (Lists, progress, pricing data) by pinning down the current extension conventions and the layout-relevant component capabilities.

Sources: official docs at `developers.raycast.com` (primary), the official `raycast/extensions` GitHub repo (templates + real store extensions), and the npm registry for current `@raycast/api` versions. Every claim below carries its source URL.

---

## 0. The one-paragraph answer

Extensions are TypeScript/React projects built with the `@raycast/api` package, whose manifest (`package.json`) declares extension metadata, commands, and preferences. You scaffold via the Raycast **Create Extension** command (or `npm init raycast-extension -t <template>` for team boilerplates); the project layout is `src/` + `assets/` + `package.json` + `tsconfig.json` + `eslint.config.js` + `.prettierrc`. Three UI surfaces exist for an at-a-glance usage view: **`List`** (searchable, sections, per-item right-side `accessories`), **`Detail`** (CommonMark markdown + metadata panel), and **`MenuBarExtra`** (macOS menu bar). Progress is expressible via `getProgressIcon()` (circular progress icon, `@raycast/utils`) and colored/tagged `accessories`; relative countdowns via `accessories: [{ date }]` (renders "now"/"1d" etc.). Background refresh is declared with the command-level `interval` manifest property (min 10s, only for `no-view` and `menu-bar` modes) and is disabled by default for Store installs until the user opts in. A Store-compatible extension additionally needs author/license/categories/512×512 icon/metadata conventions; a private or purely local extension can skip the store polish.

---

## 1. Scaffolding: `create-raycast-extension` and the standard project layout

### How you actually create an extension (primary-source, current)

The official getting-started flow is the **Create Extension** Raycast command (signed-in Raycast users): pick a name + template ("Detail", "Show List", "Menu Bar Extra", "Run Script", "Show Typeahead Results", "Submit Form", "Show Grid", "Show List and Detail", "AI"), choose a location, and Raycast writes the scaffold.

- Getting started prerequisites: Raycast ≥ 1.26.0, **Node.js ≥ 22.14**, npm ≥ 7: https://developers.raycast.com/basics/getting-started.md
- Create-your-first-extension flow (create → `npm install && npm run dev`): https://developers.raycast.com/basics/create-your-first-extension.md

**`create-raycast-extension`** (npm) is the programmatic scaffold used by `npm init raycast-extension -t <template>` for team "Extension Boilerplates". It is a thin CLI (`bin: create-raycast-extension`, v0.1.0, package source `raycast/extensions` `templates/` dir): it `git clone`s `raycast/extensions`, sparse-checks-out `templates/`, `cp`s the chosen template dir into your target folder, runs `npm install`, and tells you to run `npx ray dev`.

- Templates docs (incl. the `npm init raycast-extension -t <template-name>` command): https://developers.raycast.com/information/developer-tools/templates.md
- CLI source (what it scaffolds + how): https://github.com/raycast/extensions/blob/main/templates/index.ts
- npm: https://www.npmjs.com/package/create-raycast-extension

Boilerplate templates currently shipped in `raycast/extensions` `templates/`: `dashboard`, `bug-tracker`, `crud-admin-panel`, `people-directory`, `standups`, `team-time`, `brand-guidelines`. The **`dashboard`** template is the closest existing analog to this ticket: a metric-at-a-glance extension (see §4/§5 and the "layout implications" section). https://github.com/raycast/extensions/tree/main/templates/dashboard

### Standard project layout (from the docs)

```
extension
├── .prettierrc
├── assets/icon.png          # icons bundled into the extension; referenced at runtime + in manifest
├── eslint.config.js         # Raycast's opinionated ESLint config (eslint.config.js since v1.48.8; ESLint 9 for new scaffolds)
├── package-lock.json        # commit it — Store CI builds with npm
├── package.json             # the manifest (Raycast superset of npm package.json)
├── src/command.tsx          # one entry file per command (ts/tsx/js/jsx)
└── tsconfig.json            # provided by scaffold; you normally don't edit it
```

- File-structure doc (layout + rationale): https://developers.raycast.com/information/file-structure.md
- ESLint doc (`@raycast/eslint-config`, `eslint.config.js`, automatic since 1.48.8, ESLint 9 on new scaffolds): https://developers.raycast.com/information/developer-tools/eslint.md

### The CLI (`npx ray`, bundled in `@raycast/api`)

`@raycast/api` ships the `ray` CLI (bin `ray`). Commands in v2.2.1: `build`, `dev`/`develop`, `evals`, `lint`, `login`/`logout`, `migrate`, `profile`, `publish`, `pull-contributions`, `token`, `version`.

- `npx ray dev` (alias `develop`) — development mode: extension pinned to top of root search, auto-reload on save, detailed error overlays, terminal logs. This is what `npm run dev` runs.
- `npx ray build -e dist` — optimized production build; **performs additional type checking**; used by Store CI. (The `-e`/`--environment` flag accepts `dev|dist`.)
- `npx ray lint` — ESLint over `src/`.
- `npx ray migrate` — applies codemods to the next `@raycast/api` version.
- `npx ray publish` — verifies, builds, publishes (Store or private/org store).

Docs: https://developers.raycast.com/information/developer-tools/cli.md

### `@raycast/api` version pinning (2026-09-08 state)

- npm `latest` dist-tag = **`2.2.1`** (v2 major line, first v2 release 2026-08-19). v2.2.1 engines: **Node ≥ 22.22.2**, deps include **React 19.0.0**, CLI rebuilt on `@oclif/core`. `@raycast/utils` latest = `2.3.1`.
- v1 line still ships as **`1.104.25`** and a legacy v0 line as `0.71.7` (`latest-v0`). The official docs' changelog currently tops out at **1.103.0** (2025-09-15), so the docs pages describe the current stable API that v2 carries forward.
- Conventions seen in the field:
  - Official template boilerplates pin `"@raycast/api": "latest"` (see `templates/dashboard/package.json`).
  - Real Store extensions pin a caret range, e.g. `"@raycast/api": "^1.94.0"`, `"@raycast/utils": "^1.19.1"` (see `raycast/extensions` `extensions/hacker-news/package.json`).
- The docs tell you *not* to version the extension itself and to simply bump the `@raycast/api` dependency to adopt new API: https://developers.raycast.com/information/versioning.md
- Store checklist: "Ensure you are using the latest Raycast API version": https://developers.raycast.com/basics/prepare-an-extension-for-store.md

### tsconfig conventions (verified from real scaffolds)

The scaffold's `tsconfig.json` (from `templates/dashboard/tsconfig.json` and `extensions/hacker-news/tsconfig.json`) is:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts"],
  "compilerOptions": {
    "lib": ["es2021" | "ES2023"],
    "module": "commonjs",
    "target": "es2021" | "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

Key points: **`strict: true` is the convention**; `raycast-env.d.ts` (auto-generated when the extension runs) is included and provides the `Preferences` / `Arguments` global namespaces; module is CommonJS by default (ESM is possible, see FAQ steps below).

---

## 2. Declaring commands and preferences in `package.json` (the manifest)

The manifest is a superset of npm's `package.json`. Reference: https://developers.raycast.com/information/manifest.md

### Extension-level properties (store-facing metadata)

`name`*, `title`*, `description`*, `icon`* (png 512×512 in `assets/`, optional `@dark` variant), `author`* (your Raycast Store handle), `platforms`* (`["macOS"]` default; add `"Windows"` to opt in), `categories`*, `commands`*, plus optional `tools` (AI entry points, since 1.93.0), `ai`, `owner` + `access` (private/Teams), `contributors`, `keywords`, `preferences`, `external`.

### Command types (`mode`)

| `mode` | Behavior |
| --- | --- |
| `view` | Shows a main view (List/Detail/Form/Grid). Standard interactive command. |
| `no-view` | Runs headless; no navigation entry. Good for: open a URL, update command subtitle, background work. Must export an async `Command()` whose resolved Promise ends the run. |
| `menu-bar` | Renders a `MenuBarExtra` in the macOS menu bar (not available on Windows). |

### Per-command config (all fields)

`name`* (maps to `src/<name>.ts(x)`), `title`*, `subtitle` (root-search subtitle; dynamically updatable via `updateCommandMetadata`), `description`*, `icon`, `mode`*, `interval` (background refresh cadence for `no-view`/`menu-bar`), `keywords`, `arguments` (text/password/dropdown root-search inputs), `preferences` (command-scoped; commands inherit extension preferences and can override by same `name`), `disabledByDefault`.

Menu-bar + interval example (verbatim from the menu-bar commands doc):

```json
{
  "name": "github-pull-requests",
  "title": "Pull Requests",
  "subtitle": "GitHub",
  "description": "See your GitHub pull requests at a glance",
  "mode": "menu-bar",
  "interval": "5m"
}
```

https://developers.raycast.com/api-reference/menu-bar-commands.md

### Preferences (manifest `preferences` array)

Per-preference fields: `name`*, `title`*, `description`*, `type`*, `required`*, `placeholder`, `default` (per-platform object supported since 1.103.0). **Types:** `textfield`, **`password`** (secure entry; "for secure entry" — this is the store-blessed way to store API tokens, not Keychain), `checkbox`, `dropdown` (+ `data` array of `{title, value}`), `appPicker`, `file`, `directory`.

Important: **direct macOS Keychain access is rejected for Store extensions** ("Extensions requesting Keychain Access will be rejected due to security concerns") — use `password` preferences instead. https://developers.raycast.com/basics/prepare-an-extension-for-store.md

---

## 3. UI + data building blocks available today (layout-relevant)

### `List` — the de-facto main view for "similar data" (perfect for a usage view)

- Props: `children`, `filtering` (built-in fuzzy search over `title`/`keywords`, or `{ keepSectionOrder }`), `isLoading`, `isShowingDetail` (right-hand detail pane), `navigationTitle`, `onSearchTextChange`, `onSelectionChange`, `pagination` (≥1.69.0), `searchBarAccessory` (a `List.Dropdown` filter), `searchBarPlaceholder`, `searchText`, `selectedItemId`, `throttle`.
- `List.Section`: `title` + `subtitle` grouping.
- `List.Item`: `title` (or `{value, tooltip}`), `subtitle`, `icon`, `keywords`, `id`, `actions` (ActionPanel), `detail` (`List.Item.Detail`), `quickLook`, and — most layout-relevant — **`accessories`**.
- **`List.Item.Accessory`** — right-side column of one or more chips, each can be:
  - `text` — string, optionally `{ value, color }`
  - `tag` — string **or Date** (Date renders **relative** to now: `new Date()` → "now", yesterday → "1d"), optionally colored; `tag` renders as a pill with colored background
  - `date` — a Date, rendered relative ("now", "1d"), optionally colored
  - `icon` — an `Image.ImageLike`
  - `tooltip`
  - This is the native slot for **countdowns / "last updated" / usage numbers**.
- `List.Item.Detail` + `List.Item.Detail.Metadata` — right-side detail pane with `markdown` (CommonMark) plus structured `Metadata`: `Metadata.Label`, `Metadata.Link`, `Metadata.TagList`/`TagList.Item` (colored tags), `Metadata.Separator`. Enabled via `List isShowingDetail`.

https://developers.raycast.com/api-reference/user-interface/list.md

### `Detail` — markdown view (great for a single "usage report" screen)

- Props: `markdown` (CommonMark), `metadata`, `actions`, `isLoading`, `navigationTitle`.
- Markdown supports images (incl. `?raycast-width=`/`raycast-height=`/`raycast-tintColor=`), **LaTeX**, task lists, tables, syntax-highlighted code blocks.
- `Detail.Metadata` right-side panel: `Label`, `Link`, `TagList`, `Separator` (same primitives as List metadata).

https://developers.raycast.com/api-reference/user-interface/detail.md

### `MenuBarExtra` — macOS menu bar glanceability

- `MenuBarExtra`: `icon`, `title` (menu-bar text), `tooltip`, `isLoading`, `children`.
- `MenuBarExtra.Item`: `title`, `icon`, `subtitle`, `onAction`, `shortcut`, `alternate` (⌥-key variant), `tooltip`. Title-only or title+icon items render disabled (use for headers). Avoid long titles — menu-bar text is truncated to a single line.
- `MenuBarExtra.Submenu`, `MenuBarExtra.Section`, `MenuBarExtra.Separator`.
- Returns `null` to remove the menu bar item.
- Menu-bar commands are **not long-lived**: Raycast loads, executes, waits for `isLoading: false`, unloads. When the user clicks the item, it re-runs and stays loaded while the menu is open.

https://developers.raycast.com/api-reference/menu-bar-commands.md

### Progress bars / countdowns — the specific layout question

- **`getProgressIcon(progress, color?, { background?, backgroundOpacity? })`** from `@raycast/utils` — a built-in **circular progress icon** (progress is 0..1; default `Color.Red`; returns `Image.Asset` usable anywhere an icon is accepted, e.g. `List.Item icon=`). This is the idiomatic "progress bar" primitive. https://developers.raycast.com/utilities/icons/getprogressicon.md
- Relative **countdowns / freshness** natively: `accessories: [{ date: someFutureDate }]` or `{ tag: date }` (renders relative; multi-line `tag` text renders the relative form).
- Built-in `Icon.*` set includes clock/timer/task metaphors for usage views. https://developers.raycast.com/api-reference/user-interface/icons-and-images.md
- There is **no native linear progress-bar component**; linear progress is approximated with markdown in `Detail` (e.g. ASCII/Unicode bar in CommonMark) or with `getProgressIcon` for icon slots.

### Preferences / secure data access

- **`getPreferenceValues<T>()`** — typed (auto-generated `Preferences` global namespace; `getPreferenceValues<Preferences.MyCommand>()`). `password` preferences are typed `string`, securely stored by Raycast (not plaintext in your code).
- **`openExtensionPreferences()`** / **`openCommandPreferences()`** — open the prefs screen from a command (e.g. from an error/empty state action).
- https://developers.raycast.com/api-reference/preferences.md

### Storage & caching

- **`LocalStorage`** — shared across an extension's commands, stored in Raycast's local encrypted database; `getItem/setItem/removeItem/allItems/clear`; values are `string | number | boolean`; **not** for large data (use files in the support directory). https://developers.raycast.com/api-reference/storage.md
- **`Cache`** — synchronous LRU disk cache (default capacity 10 MB), data stored as strings (JSON.stringify), shared between commands by default, per-command `namespace` option; `get/has/set/remove/clear/subscribe`. Ideal for the menu-bar/background-refresh pattern of "cache the last fetch, render instantly". https://developers.raycast.com/api-reference/cache.md

### Feedback, opening, actions

- **`showToast`** / `Toast` (styles `Animated`/`Success`/`Failure`, updateable, primary/secondary actions; falls back to `showHUD` when the Raycast window is closed). https://developers.raycast.com/api-reference/feedback/toast.md
- **`open(target, application?)`** — open URL/file with default or a specific app. https://developers.raycast.com/api-reference/utilities.md
- **`updateCommandMetadata({ subtitle })`** — update a command's root-search subtitle at runtime; the key pattern for `no-view` background commands that show a metric. (See dashboard template, §4.)
- **Actions** — `ActionPanel` + `Action` family (`Action.OpenInBrowser`, `Action.CopyToClipboard`, `Action.Push`, `Action.Open`, `Action.OpenWith`, `Action.Trash`, …). https://developers.raycast.com/api-reference/user-interface/actions.md
- **`environment.launchType`** — `LaunchType.UserInitiated` vs `LaunchType.Background`.

### React hooks (`@raycast/utils`)

`useFetch`, `useCachedPromise`, `useCachedState`, `usePromise`, `useForm`, `useExec`, `useSQL`, `useAI`, `useFrecencySorting`, `useStreamJSON`, `useLocalStorage`, plus `getProgressIcon`, `getFavicon`, `getAvatarIcon`, `showFailureToast`, `withCache`, `createDeeplink`, `runAppleScript`, `executeSQL`. These implement the recommended caching/error patterns. https://developers.raycast.com/utilities/getting-started.md

---

## 4. Background / refresh declaration and constraints

The feature is called "background refresh"; the **manifest property is `interval`** on the command (older docs sometimes call the concept `backgroundRefresh`, but the declared field is `interval`).

- Declared per command: `"interval": "90s" | "1m" | "5m" | "12h" | "1d"` (units `s`, `m`, `h`, `d`).
- Only `no-view` and `menu-bar` commands can use it. **Minimum is 10 seconds (`10s`)** (manifest table's "1m" is stale; the background-refresh page and the 1.42.0 changelog both state 10s).
- Actual scheduling is inexact: macOS batches executions for energy efficiency; timing varies on battery. Commands are auto-terminated after a timeout dynamically adjusted to the interval, and overlapping launches are prevented.
- `no-view` commands run until the main async function's Promise resolves. `menu-bar` commands run until `isLoading` goes `false`.
- Distinguish launches with `environment.launchType` (`LaunchType.Background` vs `LaunchType.UserInitiated`).
- **Store installs: background refresh is initially disabled.** It activates when the user opens the command the first time or enables it in preferences. Raycast auto-adds on/off + "last run time" preferences for scheduled commands. "Run in Background" and "Show Error" developer actions exist in root search; `Extension Diagnostics` shows last-run info.
- Best practices: keep intervals as high as possible, make the command useful both manually and in background, respect third-party rate limits, set `isLoading: false` ASAP, use defensive programming for shared state.

https://developers.raycast.com/information/lifecycle/background-refresh.md

The official **`dashboard` template** is the canonical reference implementation for exactly this ticket's shape — a `no-view` command, `interval: "2h"`, two `password` preferences, `showToast` for progress, `updateCommandMetadata({ subtitle })` to surface the metric in root search, `getPreferenceValues` for credentials:
https://github.com/raycast/extensions/blob/main/templates/dashboard/src/daily-active-users.tsx and https://github.com/raycast/extensions/blob/main/templates/dashboard/package.json

---

## 5. Store-compatible vs local-only, and TypeScript strictness

### Store-compatible (public Raycast Store) requirements — https://developers.raycast.com/basics/prepare-an-extension-for-store.md

Metadata/config:
- `author` = your Raycast Store username; `license: MIT`; latest `@raycast/api`; `platforms` matching actual platform usage; `categories` with **at least one**, Title Case.
- Use npm and **commit `package-lock.json`** (Store CI builds with npm).
- Run a dist build (`npm run build` / `ray build -e dist`) before submitting; lint passes (automated GitHub checks).

Naming/UX:
- Apple Style Guide titles; command titles `<verb> <noun>`; subtitles only when they add context (subtitle is searchable).
- 512×512 png icon (light+`@dark` variants), **custom icon required** — "Extensions that use the default Raycast icon will be rejected".
- README.md (root) if extra setup is needed; `media/` folder for README images; `CHANGELOG.md` for version history (format: h2 `[Title] - {PR_MERGE_DATE}`).
- Screenshots: up to 6, 2000×1250 (16:10), PNG, no sensitive data.
- No Keychain access; no external analytics; no custom navigation stack; US English only; don't bundle opaque binaries; Title Case actions, ellipsis `…` on submenu actions.

### Private (Teams/org) vs local-only

- **Private extension:** set `owner` to your org handle → private by default; `access: "public"` or `"private"` controls reachability. Publish with `npm run publish` (`npx ray publish`) to the org's private store; requires login (`npx ray login`/`logout`). Create it via the Create Extension command with your org selected. https://developers.raycast.com/teams/publish-a-private-extension.md and https://developers.raycast.com/teams/getting-started.md
- **Local-only / development:** none of the store metadata is strictly required — the scaffold's minimal manifest plus `npm run dev` is enough; the extension is marked as a local development command in root search. `ray build -e dist` + lint are the only gates you'd want for your own CI.

### TypeScript strictness conventions

- `tsconfig.json` from the scaffold ships **`strict: true`**, plus `isolatedModules`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `jsx: react-jsx`, `resolveJsonModule`. (Verified in `templates/dashboard/tsconfig.json` and `extensions/hacker-news/tsconfig.json`.)
- `raycast-env.d.ts` is auto-generated when the extension runs and is `include`d — it carries the `Preferences` / `Arguments` global namespaces, so `getPreferenceValues<Preferences.MyCommand>()` is type-checked against the manifest.
- `ray build -e dist` does **additional type checking** beyond `ray dev`.
- The Raycast ESLint config enforces best practices (e.g. Title Case on actions) and is part of the scaffold.
- ESM is possible (for ESM-only packages) via `"type": "module"` + `"module": "node16"` + `.js` relative import extensions — CJS is the default. https://developers.raycast.com/misc/faq.md

---

## 6. Layout implications for the Open Code Go usage view (the decision payload)

Given the ticket exists to decide **Raycast UI layout**, here is what the available building blocks support:

- **Primary view — `List`** with sections per domain (Lists / progress / pricing): each `List.Item` = one metric/session/plan row with `accessories` on the right for numbers, colored tags, and relative dates. This is the standard, searchable, keyboard-friendly "usage view" surface.
- **Progress bars:** use `getProgressIcon(0..1, color)` as the `List.Item` `icon` (circular), and/or colored `tag` accessories with values like "87%". No native linear bar; in a `Detail` markdown view a Unicode/ASCII bar renders fine.
- **Countdowns:** `accessories: [{ date: futureDate }]` (or `{ tag: date }`) renders relative ("in 2d"); pair with a `Cache`/`LocalStorage` snapshot of the last API fetch for instant render before refresh.
- **Rich row detail:** `List isShowingDetail` + `List.Item.Detail` markdown + `Metadata` (labels, colored tags, links) to expand a selected item (e.g. a plan's pricing breakdown) without leaving the list.
- **Glanceability:** a `menu-bar` command (`MenuBarExtra`, `interval`) can surface the headline metric (e.g. total spend or daily quota) in the menu bar; a `no-view` command can push the same metric into the root-search subtitle via `updateCommandMetadata`.
- **Credentials:** `password` preferences (not Keychain — Store-rejected) + `getPreferenceValues`; `openExtensionPreferences` action from an error/empty state.
- **Pricing data:** `Detail.Metadata` + `TagList` are the idiomatic way to render a plan's features/price; `List.Dropdown` in the search bar is the idiomatic plan/environment switcher.

---

## Source index

Official docs:
- https://developers.raycast.com/ — introduction
- https://developers.raycast.com/basics/getting-started.md
- https://developers.raycast.com/basics/create-your-first-extension.md
- https://developers.raycast.com/information/file-structure.md
- https://developers.raycast.com/information/manifest.md
- https://developers.raycast.com/information/developer-tools/cli.md
- https://developers.raycast.com/information/developer-tools/eslint.md
- https://developers.raycast.com/information/developer-tools/templates.md
- https://developers.raycast.com/information/lifecycle/background-refresh.md
- https://developers.raycast.com/information/versioning.md
- https://developers.raycast.com/information/security.md (data storage)
- https://developers.raycast.com/api-reference/menu-bar-commands.md
- https://developers.raycast.com/api-reference/user-interface/list.md
- https://developers.raycast.com/api-reference/user-interface/detail.md
- https://developers.raycast.com/api-reference/preferences.md
- https://developers.raycast.com/api-reference/storage.md
- https://developers.raycast.com/api-reference/cache.md
- https://developers.raycast.com/api-reference/utilities.md
- https://developers.raycast.com/api-reference/feedback/toast.md
- https://developers.raycast.com/utilities/getting-started.md
- https://developers.raycast.com/utilities/icons/getprogressicon.md
- https://developers.raycast.com/basics/prepare-an-extension-for-store.md
- https://developers.raycast.com/teams/publish-a-private-extension.md
- https://developers.raycast.com/misc/faq.md
- https://developers.raycast.com/misc/changelog.md

Primary sources / repos:
- https://github.com/raycast/extensions (official Store extension repo; templates/ and extensions/)
  - templates/index.ts (create-raycast-extension behavior)
  - templates/dashboard/package.json, templates/dashboard/src/daily-active-users.tsx, templates/dashboard/tsconfig.json
  - extensions/hacker-news/package.json, extensions/hacker-news/tsconfig.json
- npm registry: `@raycast/api` (latest 2.2.1, latest-v0 0.71.7), `@raycast/utils` (2.3.1), `create-raycast-extension` (0.1.0), `@raycast/eslint-config` (2.2.0)