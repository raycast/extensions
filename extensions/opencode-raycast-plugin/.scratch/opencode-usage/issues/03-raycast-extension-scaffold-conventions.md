# Raycast extension scaffold and store conventions

Status: resolved
Type: research
Blocked by: —

## Question

What is the current (2026) recommended way to build a Raycast extension that this spec should target? Answer precisely, with official doc URLs:

1. Scaffolding: `create-raycast-extension` CLI and the standard project layout (src/, `@raycast/api` dependency + version pinning, tsconfig, ESLint, assets/icon, `npm run dev`).
2. Declaring commands and preferences in `package.json`: normal commands vs **menu-bar commands** vs other types; how per-command config (title, subtitle, icon, refresh interval for menu bar) is expressed.
3. UI + data building blocks available today: `List` (sections, accessories, icons), `Detail` (markdown), `MenuBarExtra`, `getPreferenceValues`, secure keychain preferences, `LocalStorage`/`Cache`, `showToast`, `open`, `openExtensionPreferences`, actions — enough to judge layout options.
4. Background/refresh: how refresh intervals are declared at build time (`backgroundRefresh`) and any constraints on background execution.
5. Store-compatibility vs local-only: what a Store-compatible extension must have (build conventions, metadata) vs what a private/local extension can skip; TypeScript strictness conventions.

This ticket exists to decide **Raycast UI layout**; the layout-relevant component capabilities and the file/preference conventions are the payload.

## Answer

Findings: `.scratch/opencode-usage/research/extension-scaffold-conventions/findings.md`

- Scaffold: `npm init raycast-extension -t <template>` (templates: List, Detail, Menu Bar Extra, …). Layout: `src/` + `assets/icon.png` + `package.json` (the manifest) + `tsconfig.json` + eslint/prettier. Run `npm run dev` (= `ray dev`, hot reload).
- `@raycast/api` current `latest` = **2.2.1** (v2, React 19, Node ≥22.22.2); v1 line 1.104.x. Template convention pins `"latest"`.
- Manifest: command `mode` ∈ `view` | `no-view` | `menu-bar`; per-command title/subtitle/icon/interval/preferences. Preference types incl. `password` (secure, Store-approved).
- Building blocks: `List` (sections, `accessories` text/tag/date — dates render relative, ideal for countdowns), `Detail`/Metadata, `MenuBarExtra` (Item/Submenu/Section, ⌥ alternates), `getProgressIcon()` from `@raycast/utils` (the idiomatic progress bar), `Cache`/`LocalStorage`, `showToast`, `open`, `openExtensionPreferences`, `launchCommand`.
- Background refresh: manifest `interval` on `no-view`/`menu-bar` (floor 10s; `s/m/h/d`); imprecise scheduling; **disabled by default on Store installs** until user opts in; `environment.launchType` distinguishes Background vs UserInitiated.
- Store vs local: Store needs author, MIT, custom 512×512 icon, package-lock, build + lint, README/screenshots; private/org-store possible; local-only skips the polish. TS convention: `strict: true` + generated `raycast-env.d.ts`.

