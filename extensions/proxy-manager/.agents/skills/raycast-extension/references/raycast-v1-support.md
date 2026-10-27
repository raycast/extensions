# API 1.104 vs 2.x — what this repo may use

This extension is built with `@raycast/api` **2.9.0** (the current major, which
the Store asks for) but its code stays inside the API that **1.104** also has, so
one build runs on Raycast 1.104 and on Raycast 2. The upstream reference files in
this folder were written against API ≤ 2.8, so check here before copying a
pattern from them.

Verified on Raycast 1.104 with the 2.9.0 build: every command rendered, including
`getFrontmostApplication()` and `Clipboard`.

## Available in 1.104 (safe)

`List` (`Item`, `Section`, `Dropdown`, `EmptyView`), `Grid`, `Detail`
(`Metadata`, `Separator`), `Form` (`TextField`, `TextArea`, `Checkbox`, `Dropdown`,
`Description`, `Separator`), `ActionPanel` (`Section`, `Submenu`), `Action`
(`Push`, `CopyToClipboard`, `OpenInBrowser`, `SubmitForm`, `Style`),
`MenuBarExtra`, `toast`/`showToast`/`showHUD`/`confirmAlert`, `Clipboard`,
`Cache`, `LocalStorage`, `getPreferenceValues`, `open`, `launchCommand`,
`useNavigation`, `popToRoot`, `environment.commandName` / `commandMode` /
`launchType`, `Icon`, `Color`, `Keyboard.Shortcut.Common`, `Toast.primaryAction`,
`getFrontmostApplication` (1.44), `getApplications`, `getSelectedText`,
`environment.canAccess`, `BrowserExtension.getTabs` / `getContent` (1.72).

## Added in 2.0 — do not use

| Symbol / file | What to use instead |
|---|---|
| `environment.entryPointType`, `entryPointName`, `entryPointMode` | `environment.commandName`, `environment.commandMode` (deprecated aliases that still work in 2.x) |
| `help.md` beside `package.json` | Optional preferences with defaults; explain setup in the empty state |
| `captureMemorySnapshot` | nothing — no memory diagnostics |
| `AI.refreshModels`, `ai.modelProvider` | not used |
| `ai.skills`, `ai.mcp` in the manifest | not used — those are Raycast AI features, unrelated to `.agents/skills` |
| `platforms: ["Windows"]` | `["macOS"]` |
| `Keyboard.Shortcut.Common` rebinding (CopyName `⌘⌥C`, Pin `⌘.`, …) | use `Keyboard.Shortcut.Common.*`, never hard-coded combos, so both apps feel native |

## How to check a symbol

The installed package is the authority:

```bash
grep -n "export declare function useSomething" node_modules/@raycast/api/types/index.d.ts
grep -n "^\s*[A-Z][A-Za-z]* = \"" node_modules/@raycast/api/types/index.d.ts   # Icon values
```

If it is not there, it does not exist in 1.104 — do not ship it.

## Manual verification matrix

| Check | Raycast 1.104 | Raycast 2.x |
|---|---|---|
| `bun run dev` imports the extension | required | required |
| All five commands appear and open | required | required |
| Consent sheet appears once, "Read Only" still renders reads | required | required |
| No `undefined is not a function` in the `ray develop` output | required | required |
| Menu-bar / Windows / AI features | n/a | n/a (not used) |

Re-run `bun run dev` from this exact folder after switching apps: a dev import is
pinned to the path it was last built from. See `docs/raycast-versions.md` in the
repo root for the upgrade policy.
