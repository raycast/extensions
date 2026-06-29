# CLAUDE.md

Operating guide for an AI coding agent working in this repo. Cheat-sheet, not a tutorial. Ground every claim here in the manifest, the toolchain config, and `dev-docs.md` (full API reference).

## Project

- **Clean Screen & Keyboard** — a Raycast extension (macOS only). Blackens the whole screen and disables keyboard input so the user can safely clean both, then restores normal state when they click a centered button on screen.
- **Status: NOT IMPLEMENTED.** `src/clean-keyboard-and-screen.ts` is currently empty (0 bytes). The single command exists in the manifest but has no code.
- Single `no-view` command; `tools: []` (not an AI extension).
- Manifest names (don't conflate): the **extension** `name` is `clean-screen---keyboard`; the single **command** `name` is `clean-keyboard-and-screen`. `author: Aleqsha`, `license: MIT`, `categories: ["System"]`, `platforms: ["macOS"]` are already set — don't overwrite them.

## Tech stack & versions

- `@raycast/api` ^1.103.0, `@raycast/utils` ^2.2.1
- TypeScript ^5.8 (commonjs, target ES2023, `strict: true`, `isolatedModules`, `esModuleInterop`, `jsx: react-jsx`)
- ESLint ^9 via `@raycast/eslint-config` ^2.0.4 (flat config: `defineConfig([...raycastConfig])`)
- Prettier ^3.5: `printWidth: 120`, `singleQuote: false` → **double quotes, 120-col**
- Node `@types/node` 22.x, `@types/react` 19.x (Raycast requires Node 22.14+)

## Commands (npm scripts)

| Script | Runs | Purpose |
|--------|------|---------|
| `npm run dev` | `ray develop` | **Live dev loop** — hot reload, auto-imports into Raycast, stack traces, terminal logs. Start this while working; Ctrl-C to stop (does not uninstall). |
| `npm run build` | `ray build` | Production build. Validate output with `npx ray build -e dist`. |
| `npm run lint` | `ray lint` | ESLint over `src/`. **Run before committing.** |
| `npm run fix-lint` | `ray lint --fix` | Auto-fix lint/format issues. |
| `npm run publish` | `npx @raycast/api@latest publish` | Publishes to the **Raycast Store** (not npm). `prepublishOnly` deliberately blocks `npm publish`. |

## Project layout

- `src/<command-name>.ts` — command entry points. The filename (minus extension) **must exactly match** the command's `name` in `package.json`. Here: the **command** `name: "clean-keyboard-and-screen"` (not the extension `name`, which is `clean-screen---keyboard`) → `src/clean-keyboard-and-screen.ts`. Use `.tsx` only for UI (view) commands; `.ts` is correct for this `no-view` command.
- `package.json` — the **manifest** (extension + command metadata, deps, scripts). See `dev-docs.md` → "Raycast Manifest".
- `assets/` — bundled icons (`extension-icon.png`, 512×512).
- `raycast-env.d.ts` — **generated**, gitignored. Do not commit or hand-edit. Other ignored: `node_modules`, `.raycast-swift-build`, `.swiftpm`, `compiled_raycast_swift`, `compiled_raycast_rust`, `.DS_Store`.

## Authoring a no-view command

A `no-view` command's default export is an **async function**, NOT a React component. It runs to completion and feedback comes only from side-effect APIs:

```ts
import { showHUD } from "@raycast/api";

export default async function Command() {
  // do work...
  await showHUD("Done");
}
```

- No React UI is allowed in a `no-view` command. Use `showHUD`, `showToast` / `Toast`, `confirmAlert`, `Clipboard`, `closeMainWindow`.
- Wrap risky work in try/catch; report with `showFailureToast` (from `@raycast/utils`) or `captureException`.
- The command unloads when the promise resolves — a long-lived overlay must NOT rely on JS staying alive (see native challenge below).

**What THIS command must do:** black out the entire screen, disable keyboard input, show a centered restore button, and revert when clicked.

## Likely APIs (read more in dev-docs.md)

- Feedback: `showHUD`, `showToast`/`Toast`, `confirmAlert` → "Feedback: HUD, Toast, Alert"
- Native automation: `runAppleScript` (`@raycast/utils`), `useExec`, Node `child_process` → "Doing native macOS things…"
- Window inspection: `WindowManagement` (Pro-gated; can only move/resize/fullscreen **existing** windows — cannot create an overlay) → "Window Management…"
- `environment` (paths, `launchType`, `canAccess`) → "System Utilities & Environment"

## Central design decision: native capability

Blacking out the screen + disabling the keyboard + showing a restore button is **NOT possible through the `@raycast/api` JS surface.** Raycast UI is AppKit-native (no DOM) and confined to its own command window; there is no API to paint a fullscreen overlay or block input. Realistic options, in order of capability:

1. **`runAppleScript` / osascript** (`@raycast/utils`) or **Node `child_process`** — extensions are NOT sandboxed for Node runtime features, so `child_process`/`fs`/net are available. AppleScript/JXA can drive scriptable apps but **cannot** create an arbitrary black overlay window or block global keyboard input. Insufficient alone for this command.
2. **Swift native bridge** (`raycast/extensions-swift-tools`; `@raycast` macro + `import { fn } from "swift:../swift"`) — the only path that reaches AppKit / CoreGraphics / CGEvent / Accessibility. Required to:
   - Create a borderless black `NSWindow` per `NSScreen` at `.screenSaver` level (multi-monitor: iterate `NSScreen.screens`).
   - Make that window key/modal with a centered `NSButton` to dismiss (swallows most keys while key — no special permission), OR install a `CGEvent` tap (`.cgSessionEventTap`) returning `nil` to suppress keystrokes system-wide.
   - Note: the Swift side must **own/retain** the overlay window + run loop and resolve its async Promise only on dismiss, because the Raycast command's JS lifecycle is short. Requires Xcode, Swift 5.9+. Not in official docs — see `dev-docs.md` → "Doing native macOS things…".

**OS permissions** (granted to the **Raycast parent app** in System Settings > Privacy & Security, inherited by the extension):
- **Accessibility** — required for a CGEvent tap to *consume/suppress* keyboard input.
- **Screen Recording** — only needed to *capture* screen pixels; NOT needed to merely draw a black overlay.
- **Automation** — prompted when AppleScript drives another app.

Decide the architecture (osascript-only vs. Swift sidecar) before writing the command body; a faithful implementation of the description almost certainly needs the Swift bridge.

## Conventions an agent MUST follow

- TypeScript `strict` — no implicit any, handle `null`/`undefined`.
- Formatting: Prettier `printWidth: 120`, **double quotes** (`singleQuote: false`). Run `npm run fix-lint`.
- Lint with `@raycast/eslint-config`; run `npm run lint` before committing.
- Command file ↔ manifest `name` map 1:1. Adding/renaming a command means updating both.

## Hard rules / gotchas

- Keep the command `name` (`clean-keyboard-and-screen`) and the src filename in sync; a mismatch means Raycast can't find the entry point.
- A `no-view` command must not render React UI — feedback via HUD/Toast/Alert only.
- Never commit or edit `raycast-env.d.ts` (generated, gitignored).
- `npm run publish` targets the Raycast Store, not npm; don't run `npm publish`.
- `WindowManagement` and AI APIs are Raycast Pro–gated and macOS-only; guard with `environment.canAccess(...)`. (This extension shouldn't need them.)
- Node `child_process`/`fs` ARE available (extensions aren't Node-sandboxed) — the RPC limit only restricts Raycast operations.

## Reference

Full API details, signatures, examples, and source links live in `dev-docs.md`. Consult it before using an API; do not invent API surface.
