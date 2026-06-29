# Raycast Extension Developer Reference

A comprehensive developer reference for building Raycast extensions, distilled from the official Raycast documentation and tailored to this repository: **`clean-screen---keyboard`** (title "Clean Screen & Keyboard"), a single-command, `no-view`, macOS-only, `System`-category extension whose command is **not yet implemented** (`src/clean-keyboard-and-screen.ts` is currently empty).

This document is both a general reference for `@raycast/api` + `@raycast/utils` and a focused analysis of the hard part of this project: blacking out the whole screen and disabling keyboard input until a centered button is clicked — which, as you'll see in §13, is **not achievable with the plain JS API** and requires the native Swift bridge.

> Ground rule used throughout: every API, signature, and prop table below is taken from the official docs. Where the docs are ambiguous or fast-moving (e.g. `AI.Model` membership), this is flagged inline.

---

## Table of Contents

1. [Overview & mental model](#1-overview--mental-model)
2. [Prerequisites, the `ray` CLI & the dev loop](#2-prerequisites-the-ray-cli--the-dev-loop)
3. [File structure & the command-file naming rule](#3-file-structure--the-command-file-naming-rule)
4. [Manifest (package.json) reference](#4-manifest-packagejson-reference)
5. [Command lifecycle & modes (view / no-view / menu-bar)](#5-command-lifecycle--modes)
6. [Feedback APIs (HUD, Toast, Alert)](#6-feedback-apis-hud-toast-alert)
7. [System Utilities & Environment](#7-system-utilities--environment)
8. [Clipboard, Cache, LocalStorage & Preferences](#8-clipboard-cache-localstorage--preferences)
9. [UI components](#9-ui-components)
10. [Window Management, Browser Extension, OAuth, AI](#10-window-management-browser-extension-oauth-ai)
11. [@raycast/utils — hooks & functions](#11-raycastutils--hooks--functions)
12. [AI Extensions & Tools (the `tools` manifest field)](#12-ai-extensions--tools)
13. [Doing native macOS things — and this project's hard requirements](#13-doing-native-macos-things)
14. [Debugging, best practices, the Store, publishing, security, versioning](#14-debugging-best-practices-store-publishing-security-versioning)
15. [Sources](#15-sources)

---

## 1. Overview & mental model

A Raycast extension is a **TypeScript/React project** built against the [`@raycast/api`](https://www.npmjs.com/package/@raycast/api) package and developed on macOS (and now Windows). At runtime:

- Each extension runs in its **own v8 isolate** (a worker thread) inside a **single Node.js child process** that Raycast manages, with its own event loop, JS engine, Node instance and limited heap.
- The extension talks to Raycast over a **thin RPC protocol** that exposes only a defined set of APIs — an extension cannot perform arbitrary Raycast operations.
- Crucially, extensions are **not further sandboxed** for file I/O, networking, or the rest of the Node runtime. So `child_process`, `fs`, and `net` are fully available; the RPC restriction only limits *Raycast* operations.
- Raycast renders UI **natively via AppKit** using a custom React reconciler. **There is no DOM** — `react-dom` is unusable, and you can only render the documented components (`List`, `Detail`, `Form`, `Grid`, `MenuBarExtra`, …).

An extension is described by a **manifest** (`package.json`) that declares one or more **commands**. Each command has a `mode`:

| `mode` | Default export | Renders UI? | Typical use |
|--------|----------------|-------------|-------------|
| `view` | React component | Yes (List/Detail/Form/Grid) | Interactive UI |
| `no-view` | `async function` | No (side-effect feedback only) | Run-and-finish actions |
| `menu-bar` | React component → `MenuBarExtra` | Menu bar item | Ambient status |

**This project** declares exactly one `no-view` command (`clean-keyboard-and-screen`). A `no-view` command's default export is an async function that runs to completion and gives feedback through side-effect APIs (HUD/Toast). See §5 and §13 for why this command also needs native Swift code.

---

## 2. Prerequisites, the `ray` CLI & the dev loop

### Prerequisites

- **Raycast 1.26.0+** installed.
- **Node.js 22.14+** (Raycast recommends `nvm`). This repo pins exact versions: `@types/node` `22.19.17` and `@types/react` `19.0.10` (exact pins, not ranges).
- **npm 7+**.
- A **Raycast account, signed in** — required to even see the development commands (Store, Create Extension, Import Extension, Manage Extensions).
- Familiarity with **React** and **TypeScript**.

### Scaffolding

Use Raycast's **Create Extension** command (pick a template, a name, and a parent folder). Then in the new directory:

```bash
npm install && npm run dev
```

The extension appears at the top of Raycast's root search; press `↵` to open it. `npm run dev` hot-reloads on save and auto-imports the extension into Raycast.

### The `ray` CLI

The CLI ships bundled with `@raycast/api`. Run `npx ray help` inside the extension dir for the authoritative, version-specific flag list. Invoke via `npx ray <cmd>` or through `package.json` scripts.

| Command | What it does |
|---------|--------------|
| `ray build` | Optimized production build for distribution. Validate locally with `npx ray build -e dist` (emits to a `dist` folder). |
| `ray develop` | Dev mode: top-of-root-search placement, auto-reload, detailed stack traces in error overlays, terminal logs, build-error status, auto-import. |
| `ray lint` | ESLint over `src`. Auto-fix with `ray lint --fix`. |
| `ray migrate` | Migrates the extension to the latest `@raycast/api`. |
| `ray publish` | Verifies, builds, and publishes to the Raycast Store (or org private store). |

### This repo's `scripts` (the Raycast template default)

```json
"scripts": {
  "build": "ray build",
  "dev": "ray develop",
  "fix-lint": "ray lint --fix",
  "lint": "ray lint",
  "prepublishOnly": "echo \"...\" && exit 1",
  "publish": "npx @raycast/api@latest publish"
}
```

- `npm run dev` → `ray develop` (everyday loop). Stop with `⌃C`; the extension stays installed.
- `npm run publish` → publishes to the **Raycast Store**, NOT npm. The `prepublishOnly` guard deliberately fails `npm publish`.

### Toolchain config in this repo

- **tsconfig.json**: `module: commonjs`, `target: ES2023`, `lib: ["ES2023"]`, `strict: true`, `isolatedModules`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `resolveJsonModule`, `jsx: react-jsx`, `include: ["src/**/*", "raycast-env.d.ts"]`.
- **.prettierrc**: `{ "printWidth": 120, "singleQuote": false }` → **double quotes, 120-column** width.
- **eslint.config.js**: flat config extending `@raycast/eslint-config`, e.g. `defineConfig([...raycastConfig])`.
- **.gitignore**: `node_modules`, `raycast-env.d.ts`, `.raycast-swift-build`, `.swiftpm`, `compiled_raycast_swift`, `compiled_raycast_rust`, `.DS_Store`. (Note the Swift/Rust build artifacts already ignored — relevant for §13.)

---

## 3. File structure & the command-file naming rule

Standard layout:

```
extension
├── .prettierrc
├── assets
│   └── icon.png
├── eslint.config.js
├── node_modules
├── package-lock.json
├── package.json
├── src
│   └── command.tsx
└── tsconfig.json
```

| Path | Role |
|------|------|
| `src/` | Source. `ts`, `tsx`, `js`, `jsx` supported. Use `tsx`/`jsx` for UI commands; `ts`/`js` are fine for logic-only `no-view`/`menu-bar`. |
| `assets/` | Optional. Icons bundled with the extension; referenced by filename in the manifest. |
| `package.json` | The manifest: metadata, commands, deps, scripts. |
| `tsconfig.json` | Usually needs no editing. |
| `eslint.config.js` | ESLint via `@raycast/eslint-config`. |
| `.prettierrc` | Prettier rules. |

### The naming rule (critical)

The command `name` in the manifest maps **directly** to a source entry-point file in `src/`:

- `name: "create"` → `src/create.{ts,tsx,js,jsx}`
- `name: "index"` → `src/index.{ts,tsx,js,jsx}`

The filename (minus extension) must **exactly match** `name`; each command needs its own file. **This repo**: `name: "clean-keyboard-and-screen"` → `src/clean-keyboard-and-screen.ts` (already present, currently empty). Because the manifest mode is `no-view`, a `.ts` (not `.tsx`) file is correct unless you later render UI.

---

## 4. Manifest (package.json) reference

The manifest is a superset of an npm `package.json`. Standard npm fields (`dependencies`, `devDependencies`, `scripts`, `version`) coexist with Raycast fields. The Store requires a `package-lock.json`.

### Top-level (extension) fields (`*` = required)

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| `name`* | string | ✓ | Unique id, used in Store links — keep short & URL-compatible (lowercase, hyphenated). |
| `title`* | string | ✓ | Display title in Store & preferences. |
| `description`* | string | ✓ | Full Store description. |
| `icon`* | string | ✓ | 512×512 PNG in `assets/`. Add `icon@dark.png` for dark theme. |
| `author`* | string | ✓ | Your Raycast Store handle. |
| `platforms`* | string[] | ✓ | `"macOS"` and/or `"Windows"` (exact casing). |
| `categories`* | string[] | ✓ | Title Case, case-sensitive (see list below). |
| `commands`* | object[] | ✓ | Array of command objects. |
| `license` | string | — | Store requires `"MIT"`. |
| `tools` | object[] | — | AI tools (can be empty `[]`). |
| `ai` | object | — | `instructions` + `evals`. |
| `owner` / `access` | string | — | Org publishing; `access` is `"public"`/`"private"`. |
| `contributors` / `pastContributors` | string[] | — | Raycast handles. |
| `keywords` | string[] | — | Extra Store search terms. |
| `preferences` | object[] | — | Extension-wide preferences. |
| `external` | string[] | — | Packages/files excluded from the build but evaluated at runtime. |
| `$schema` | string | — | `https://www.raycast.com/schemas/extension.json` (editor validation). |

**Allowed `categories`:** `Applications`, `Communication`, `Data`, `Design Tools`, `Developer Tools`, `Documentation`, `Finance`, `Fun`, `Media`, `News`, `Productivity`, `Security`, `System`, `Web`, `Other`. (This repo uses `System`.)

### `commands[]` schema

| Property | Type | Req | Default | Description |
|----------|------|-----|---------|-------------|
| `name`* | string | ✓ | — | Unique id → maps to `src/{name}.{ts,tsx,js,jsx}`. |
| `title`* | string | ✓ | — | Shown in Store, Preferences, root search. |
| `description`* | string | ✓ | — | What the command does. |
| `mode`* | string | ✓ | — | `"view"`, `"no-view"`, or `"menu-bar"`. |
| `subtitle` | string | — | — | Root-search subtitle; updatable at runtime via `updateCommandMetadata`. |
| `icon` | string | — | extension icon | PNG ≥512×512. |
| `interval` | string | — | — | Background interval (`"10s"`,`"1m"`,`"12h"`,`"1d"`); **minimum 10s** (use sparingly); **no-view/menu-bar only**. |
| `keywords` | string[] | — | — | Extra search keywords. |
| `arguments` | object[] | — | — | Up to 3 arguments. |
| `preferences` | object[] | — | — | Command-specific prefs; same-`name` overrides extension pref. |
| `disabledByDefault` | boolean | — | `false` | Only applied on fresh install / when newly added. |

**This repo's command:**

```json
{
  "mode": "no-view",
  "name": "clean-keyboard-and-screen",
  "title": "Clean keyboard and screen",
  "description": "Blackens the screen and disables keyboard input ...",
  "subtitle": "Disable keyboard input and darken your screen until you click a centered button"
}
```

### `arguments[]` schema (max 3 per command; manifest order = display order; required first)

| Property | Type | Req | Default | Description |
|----------|------|-----|---------|-------------|
| `name`* | string | ✓ | — | Key in the `arguments` prop object. |
| `type`* | string | ✓ | — | `"text"`, `"password"` (masked), or `"dropdown"`. |
| `placeholder`* | string | ✓ | — | Input hint. |
| `required` | boolean | — | `false` | Block command open until entered. |
| `data` | object[] | dropdown | — | `[{ "title": string, "value": string }]`. |

Value types: `text`→`string`, `password`→`string`, `dropdown`→`string`.

```tsx
export default function MyCommand(props: LaunchProps<{ arguments: Arguments.MyCommand }>) {
  const { title, subtitle } = props.arguments;
}
```

### `preferences[]` schema (extension-level or per-command)

| Property | Type | Req | Description |
|----------|------|-----|-------------|
| `name`* | string | ✓ | Unique id. |
| `title`* | string | ✓ | Display name / grouped-checkbox section title. |
| `description`* | string | ✓ | Tooltip explanation. |
| `type`* | string | ✓ | `textfield`, `password`, `checkbox`, `dropdown`, `appPicker`, `file`, `directory`. |
| `required`* | boolean | ✓ | Block command open until entered. |
| `placeholder` | string | — | When empty. |
| `default` | mixed | — | Type-dependent; supports `{ "macOS": ..., "Windows": ... }`. |
| `label` | string | checkbox | Label next to the checkbox. |
| `data` | object[] | dropdown | `[{ "title", "value" }]`. |

Preference type → runtime value type:

| Type | Value |
|------|-------|
| textfield | string |
| password | string |
| checkbox | boolean |
| dropdown | string |
| appPicker | `Application` |
| file | string |
| directory | string |

> Idea for this project: a `dropdown`/`textfield` preference for **dim opacity** (full black vs. 80% dim) or a checkbox to **also block the trackpad/mouse**, read via `getPreferenceValues<Preferences>()` (§8).

### `tools[]` schema (AI extensions)

| Property | Type | Req | Description |
|----------|------|-----|-------------|
| `name`* | string | ✓ | Unique id → `src/tools/{name}.ts`. |
| `title`* | string | ✓ | Display name. |
| `description`* | string | ✓ | Helps users *and the AI*. |
| `icon` | string | — | PNG ≥512×512; falls back to extension icon. |

This repo has `tools: []` (no AI tools). See §12.

### `ai` object

| Property | Type | Description |
|----------|------|-------------|
| `instructions` | string | Injected as a system message when the extension is mentioned. |
| `evals` | object | Eval config (see §12). Can live in a root `ai.yaml` instead. |

---

## 5. Command lifecycle & modes

`environment.commandMode` reflects the manifest `mode` at runtime as `"view" | "no-view" | "menu-bar"`. Every default export receives `LaunchProps` as its first parameter.

### `LaunchProps`

```tsx
import { Detail, LaunchProps } from "@raycast/api";

export default function Command(props: LaunchProps) {
  return <Detail markdown={props.fallbackText || "# Hello"} />;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `arguments` | `Arguments` | Manifest-declared argument values. Generic: `LaunchProps<{ arguments: Arguments.MyCommand }>`. |
| `launchType` | `LaunchType` | User-initiated vs background. |
| `draftValues` | `Form.Values` | Draft form data (for draft-enabled forms). |
| `fallbackText` | `string` | Text when used as a fallback command (pre-fills search/first input). |
| `launchContext` | `LaunchContext` | JSON-serializable object passed via `launchCommand`/deeplink `context`. |

### `LaunchType`

```ts
enum LaunchType { UserInitiated, Background }
```

### 5.1 View command

```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="# Hello" />;
}
```

Stays alive until dismissed (`ESC`).

### 5.2 No-view command (this project's mode) — END TO END

The default export is an **`async function`, NOT a React component**. It runs on launch, performs async work, and **must resolve/return**; feedback comes from side-effect APIs (`showHUD`, `showToast`, `Clipboard`, `updateCommandMetadata`, `closeMainWindow`). When the promise resolves, Raycast unloads the command.

```tsx
import { showHUD } from "@raycast/api";

export default async function Command() {
  await showHUD("Hello");
}
```

Lifecycle: launch → call `async function Command(props)` → read args/context → do async work → produce feedback → promise resolves → Raycast unloads. If it never resolves (or exceeds memory), Raycast terminates it. Background launches auto-terminate after an interval-scaled timeout.

A realistic skeleton for **this extension** (the native call from §13 is the missing piece):

```tsx
import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
// import { startBlackoutOverlay } from "swift:../swift"; // see §13

export default async function Command() {
  try {
    // Native overlay owns its own window + run loop, blocks keyboard,
    // and resolves only when the user clicks the centered "Done" button.
    // await startBlackoutOverlay();
    await showHUD("Screen and keyboard restored");
  } catch (error) {
    await showFailureToast(error, { title: "Could not start cleaning mode" });
  }
}
```

> Why a no-view command fits: there's nothing useful to render in Raycast's window — the UI is a fullscreen native overlay outside Raycast. The command launches, hands off to native code, and finishes.

### 5.3 Menu-bar command

```tsx
import { Icon, MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Section title="New">
        <MenuBarExtra.Item title="Raycast" onAction={() => open("https://www.raycast.com")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

**`MenuBarExtra` props:** `children`, `icon` (`Image.ImageLike`), `isLoading` (set `true` during async work, `false` when done — required for unload), `title`, `tooltip`. May return `null` to remove the item.
**`MenuBarExtra.Item`:** `title`* + `icon`, `onAction((event: MenuBarExtra.ActionEvent))`, `shortcut`, `subtitle`, `tooltip`, `alternate`. Items with only a `title` render disabled.
**`MenuBarExtra.Submenu`:** `title`* + `icon`, `children`. **`MenuBarExtra.Section`:** `title`, `children` (auto separator).
`MenuBarExtra.ActionEvent`: `{ type: "left-click" | "right-click" }`.

### Background refresh

Add `interval` to a `no-view`/`menu-bar` command (view commands cannot). Units `s`/`m`/`h`/`d`; **minimum 10s** (use cautiously), approximate scheduling. Disabled by default for Store-installed commands until first manual launch or explicit opt-in. Branch on `environment.launchType`:

```tsx
import { environment, updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const count = await fetchUnreadNotificationCount();
  await updateCommandMetadata({ subtitle: `Unread Notifications: ${count}` });
}
```

`updateCommandMetadata` currently only supports `subtitle` (of the current command).

### Launching programmatically & deeplinks

```tsx
import { launchCommand, LaunchType } from "@raycast/api";

await launchCommand({ name: "list", type: LaunchType.UserInitiated, context: { foo: "bar" } });
```

- `IntraExtensionLaunchOptions`: `name`*, `type`*, `arguments?`, `context?`, `fallbackText?`.
- `InterExtensionLaunchOptions`: the above plus `extensionName`* and `ownerOrAuthorName`*.
- Throws if the target command doesn't exist / is disabled.

Deeplink format: `raycast://extensions/<author-or-owner>/<extension-name>/<command-name>`, with optional query params `launchType` (`userInitiated`/`background`), `arguments` (URL-encoded JSON), `context` (URL-encoded JSON → `launchContext`), `fallbackText`. Launches prompt for confirmation. Build them with `createDeeplink` (§11) — note its documented Extension options list `arguments`/`fallbackText`/`launchType` but not `context`; use a raw deeplink param or `launchCommand` for `launchContext`.

---

## 6. Feedback APIs (HUD, Toast, Alert)

These are the primary UX surface for `no-view` commands like this one.

### `showHUD` (`@raycast/api`)

Hides the main window and shows a compact message at screen bottom — ideal to confirm a finished action. Accepts the same options as `closeMainWindow`.

```ts
async function showHUD(
  title: string,
  options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }
): Promise<void>;
```

```tsx
import { PopToRootType, showHUD } from "@raycast/api";

export default async function Command() {
  await showHUD("Hey there 👋", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
```

`PopToRootType`: `Default` (respects user pref), `Immediate`, `Suspended`.

### `showToast` & `Toast` (`@raycast/api`)

Returns a **mutable** `Toast`; assign to `toast.style`/`title`/`message` to update in place. Falls back to `showHUD()` when the Raycast window is closed (so toasts work in `no-view`/background too).

```ts
async function showToast(options: Toast.Options): Promise<Toast>;
```

| `Toast.Options` | Type | Req | Default | |
|---|---|---|---|---|
| `title` | string | ✓ | — | Top line. |
| `message` | string | — | — | Extra info. |
| `style` | `Toast.Style` | — | `Success` | `Animated`/`Success`/`Failure`. |
| `primaryAction` / `secondaryAction` | `Toast.ActionOptions` | — | — | Shown on hover. |

`Toast.ActionOptions`: `title`*, `onAction: (toast: Toast) => void`*, `shortcut?`. (Note: Toast's `onAction` **receives the toast**; Alert's does not.)

Progress pattern:

```tsx
import { showToast, Toast } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading image" });
  try {
    await setTimeout(1000);
    toast.style = Toast.Style.Success;
    toast.title = "Uploaded image";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to upload image";
    if (err instanceof Error) toast.message = err.message;
  }
}
```

### `confirmAlert` & `Alert` (`@raycast/api`)

Modal alert resolving to a `boolean` (`true` = primary action, `false` = dismissed).

```ts
async function confirmAlert(options: Alert.Options): Promise<boolean>;
```

| `Alert.Options` | Type | Req | Default | |
|---|---|---|---|---|
| `title` | string | ✓ | — | |
| `message` | string | — | — | |
| `icon` | `Image.ImageLike` | — | — | |
| `primaryAction` / `dismissAction` | `Alert.ActionOptions` | — | — | |
| `rememberUserChoice` | boolean | — | `false` | Adds "Do not show again". |

`Alert.ActionOptions`: `title`*, `onAction?: () => void` (**no args**), `style?: Alert.ActionStyle` (`Default`/`Destructive`/`Cancel`).

```tsx
import { confirmAlert } from "@raycast/api";

export default async function Command() {
  if (await confirmAlert({ title: "Are you sure?" })) console.log("confirmed");
}
```

### `showFailureToast` (`@raycast/utils`)

Convenience for catch blocks. **Imported from `@raycast/utils`**, not `@raycast/api`.

```ts
function showFailureToast(error: unknown, options?: { title?: string; primaryAction?: Toast.ActionOptions }): Promise<Toast>;
```

```tsx
import { showFailureToast } from "@raycast/utils";
// catch (error) { await showFailureToast(error, { title: "Could not run AppleScript" }); }
```

---

## 7. System Utilities & Environment

All from `@raycast/api`. (The System Utilities page lives at `/api-reference/utilities`, not `/system-utilities`.)

### Utilities

```ts
async function open(target: string, application?: Application | string): Promise<void>;
async function trash(path: PathLike | PathLike[]): Promise<void>;
async function showInFinder(path: PathLike): Promise<void>;
async function getApplications(path?: PathLike): Promise<Application[]>;
async function getDefaultApplication(path: PathLike): Promise<Application>;
async function getFrontmostApplication(): Promise<Application>;
async function getSelectedText(): Promise<string>;
async function getSelectedFinderItems(): Promise<FileSystemItem[]>;
function captureException(exception: unknown): void; // reports to the Developer Hub
```

- `open`'s `application` accepts an app name, bundle id (`"com.google.Chrome"`), absolute path, or `Application`; omit for system default.
- `getSelectedText()` **rejects** if no text is selected; `getSelectedFinderItems()` **rejects** if Finder isn't frontmost; `getDefaultApplication`/`getFrontmostApplication` reject if none found. Always `try/catch`.
- `captureException` is synchronous and the recommended way to surface caught errors from published extensions.

```tsx
import { getFrontmostApplication } from "@raycast/api";
const app = await getFrontmostApplication();
console.log(`Frontmost: ${app.name}`);
```

**Types:**

```ts
interface Application { name: string; path: string; bundleId?: string; localizedName?: string; windowsAppId?: string; }
type PathLike = string | Buffer | URL; // Node fs.PathLike
interface FileSystemItem { path: string; }
```

### Environment

A global `environment` object:

| Property | Type | Description |
|----------|------|-------------|
| `appearance` | `"dark" \| "light"` | Raycast appearance. |
| `textSize` | `"medium" \| "large"` | Text size. |
| `assetsPath` | string | Absolute path to `assets/`. |
| `supportPath` | string | Writable storage dir for the extension. |
| `commandName` / `commandMode` | string | From package.json. |
| `extensionName` / `ownerOrAuthorName` | string | From package.json. |
| `isDevelopment` | boolean | Dev vs installed. |
| `launchType` | `LaunchType` | UserInitiated / Background. |
| `raycastVersion` | string | Raycast app version. |
| `canAccess` | `(api: unknown) => boolean` | Whether the user can access a gated API (e.g. `AI`, `WindowManagement`). |

```tsx
import { AI, environment, showHUD } from "@raycast/api";
if (environment.canAccess(AI)) { /* ... */ } else { await showHUD("You don't have access :("); }
```

### Window & Search Bar

```ts
async function closeMainWindow(options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
async function popToRoot(options?: { clearSearchBar?: boolean }): Promise<void>;
async function clearSearchBar(options?: { forceScrollToTop?: boolean }): Promise<void>; // forceScrollToTop default true
```

```tsx
import { closeMainWindow, PopToRootType } from "@raycast/api";
await closeMainWindow({ popToRootType: PopToRootType.Suspended });
```

> For this project, you'll likely `closeMainWindow()` (or `showHUD`, which closes it) before/after handing off to the native overlay, so Raycast's own window isn't sitting on top of the blacked-out screen.

---

## 8. Clipboard, Cache, LocalStorage & Preferences

### Clipboard (`@raycast/api`, namespace) — all async

| Function | Signature |
|----------|-----------|
| `copy` | `copy(content: string \| number \| Clipboard.Content, options?: Clipboard.CopyOptions): Promise<void>` |
| `paste` | `paste(content: string \| number \| Clipboard.Content): Promise<void>` |
| `clear` | `clear(): Promise<void>` |
| `read` | `read(options?: { offset?: number }): Promise<Clipboard.ReadContent>` |
| `readText` | `readText(options?: { offset?: number }): Promise<string \| undefined>` |

```ts
type Content = { text: string } | { file: PathLike } | { html: string; text?: string };
type ReadContent = { text: string } | { file?: string } | { html?: string };
interface CopyOptions { concealed?: boolean; } // true => not recorded in Clipboard History
```

`offset` accesses Clipboard History (min 0, max 5 → up to 6 entries). Write `Content` uses `file: PathLike`; read `ReadContent` returns `file?: string`.

### Cache (`@raycast/api`, class) — synchronous, string-only, LRU

```ts
new Cache(options?: { capacity?: number; namespace?: string }); // capacity default 10MB
cache.get(key): string | undefined;
cache.has(key): boolean;
cache.set(key, data: string): void; // LRU-evicts when over capacity
cache.remove(key): boolean;
cache.clear(options?: { notifySubscribers?: boolean }): void;
cache.subscribe(subscriber: Cache.Subscriber): Cache.Subscription;
readonly cache.isEmpty: boolean;
```

Stores only strings (`JSON.stringify`/`parse`). Lossy (LRU eviction) — never store irreplaceable data. Shared across the extension's commands unless `namespace` is set.

### LocalStorage (`@raycast/api`, namespace) — async, encrypted, durable

```ts
async getItem<T extends Value = Value>(key): Promise<T | undefined>;
async setItem(key, value: Value): Promise<void>;
async removeItem(key): Promise<void>;
async allItems<T extends Values = Values>(): Promise<T>;
async clear(): Promise<void>;
type Value = string | number | boolean;
```

Encrypted, per-extension, no eviction — for durable user data. Not for large blobs (use `node:fs` under `environment.supportPath`).

**When to use which:** `Clipboard` for the system clipboard; `Cache` for recomputable/derived data (sync, lossy); `LocalStorage` for durable user data (async, encrypted). React wrappers: `useCachedState` (Cache) and `useLocalStorage` (LocalStorage, with `isLoading`) — §11.

### Preferences

```ts
import { getPreferenceValues, openExtensionPreferences, openCommandPreferences } from "@raycast/api";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>(); // types auto-generated into raycast-env.d.ts
}
```

`getPreferenceValues()` returns manifest-declared preference values (defaults as fallbacks). A global `Preferences` namespace is generated (e.g. `Preferences.CleanKeyboardAndScreen`). `openExtensionPreferences()` / `openCommandPreferences()` open the relevant prefs pane.

---

## 9. UI components

> This extension is `no-view`, so it renders **no** Raycast UI. This section is the general reference; skip to §13 for the native overlay. (If you ever add a settings/help `view` command, this is what you'd use.)

### Containers: List, Grid, Detail

A `view` command's default export returns one of these as its root. **This `no-view` extension uses none of them** — included for completeness.

#### List

Searchable, filterable, paginated list of items.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | — | `List.Item` / `List.Section` (or `List.EmptyView`). |
| `isLoading` | boolean | — | Loading bar under the search bar. |
| `filtering` | boolean \| `{ keepSectionOrder: boolean }` | — | Native filtering. **Auto-disabled when `onSearchTextChange` is set** — pass `true` to keep it. |
| `searchText` | string | — | Controlled search-bar text. |
| `onSearchTextChange` | `(text: string) => void` | — | Search callback (for async/server-side filtering). |
| `throttle` | boolean | — | Throttle `onSearchTextChange`. |
| `searchBarPlaceholder` | string | — | Search-bar hint. |
| `searchBarAccessory` | `<List.Dropdown>` | — | Dropdown right of the search bar. |
| `isShowingDetail` | boolean | — | Show the right-hand detail pane. |
| `pagination` | `{ hasMore; onLoadMore; pageSize }` | — | Infinite scroll. |
| `selectedItemId` / `onSelectionChange` | string / `(id) => void` | — | Controlled selection. |
| `navigationTitle` | string | — | Title shown in Raycast. |
| `actions` | ReactNode | — | ActionPanel used when there are no children. |

- **`List.Item`** — `title`* (`string \| { value; tooltip? }`), `subtitle`, `icon`, `accessories` (`List.Item.Accessory[]`: `tag`/`text`/`date`/`icon`/`tooltip`, each optionally `{ color, value }`), `keywords`, `id` (defaults to a UUID — set it for stable selection), `detail` (`<List.Item.Detail>`), `actions`, `quickLook`.
- **`List.Section`** — `title`, `subtitle`, `children`.
- **`List.Dropdown`** — `tooltip`*, `value`/`defaultValue`/`onChange`, `storeValue` (persist across runs), `+ List.Dropdown.Item` (`title`*, `value`*, `icon`, `keywords`) and `List.Dropdown.Section`.
- **`List.EmptyView`** — `title`, `description`, `icon`, `actions`.
- **`List.Item.Detail`** — `markdown`, `isLoading`, `metadata` → `<List.Item.Detail.Metadata>` with `.Label` (`title`*, `text`, `icon`), `.Link` (`title`*, `target`*, `text`*), `.TagList` + `.TagList.Item` (`text`/`icon`/`color`/`onAction`), `.Separator`.

```tsx
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List isShowingDetail searchBarPlaceholder="Filter beers…">
      <List.Section title="Beers">
        <List.Item
          id="1"
          title="Sierra Nevada IPA"
          subtitle="US · 6.7%"
          accessories={[{ text: "Hoppy" }]}
          detail={<List.Item.Detail markdown="# IPA" />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content="Sierra Nevada IPA" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
```

#### Grid

Like `List` but image-first. Shares the search / filtering / pagination / dropdown / empty-view props; replaces `icon` with `content` and drops `accessories` / `detail` / `isShowingDetail`. Grid-specific props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | number (1–8) | — | Columns per section. |
| `aspectRatio` | `"1"`\|`"3/2"`\|`"2/3"`\|`"4/3"`\|`"3/4"`\|`"16/9"`\|`"9/16"` | — | Item aspect ratio. |
| `fit` | `Grid.Fit` (`Contain` \| `Fill`) | `Contain` | Letterbox vs. crop. |
| `inset` | `Grid.Inset` (`Small`\|`Medium`\|`Large`) | — | Padding inside each cell. |

`Grid.Item`: `content`* (`Image.ImageLike \| { color } \| { value; tooltip }`), `title`, `subtitle`, `id`, `keywords`, `actions`, `accessory`, `quickLook`. `Grid.Section` can override `columns`/`aspectRatio`/`fit`/`inset` per section. `Grid.Dropdown` and `Grid.EmptyView` mirror the List equivalents.

```tsx
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid columns={5} inset={Grid.Inset.Large}>
      <Grid.Item content="🥳" title="Partying Face" />
    </Grid>
  );
}
```

#### Detail

Renders a CommonMark markdown string, optionally with a metadata sidebar.

| Prop | Type | Description |
|------|------|-------------|
| `markdown` | string | CommonMark to render. |
| `isLoading` | boolean | Loading bar. |
| `navigationTitle` | string | Title shown in Raycast. |
| `actions` | ReactNode | ActionPanel. |
| `metadata` | `<Detail.Metadata>` | Right-hand metadata panel. |

`Detail.Metadata` children: `.Label` (`title`*, `text`, `icon`), `.Link` (`title`*, `target`*, `text`*), `.TagList` + `.TagList.Item` (`text`/`color`/`icon`/`onAction`), `.Separator`.

```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="# Example"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text="Demo" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item text="Guide" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
```

### Action (base)

| Prop | Type | Req | Default | |
|------|------|-----|---------|---|
| `title` | string | ✓ | — | |
| `onAction` | `() => void` | — | — | |
| `icon` | `Image.ImageLike` | — | — | |
| `shortcut` | `Keyboard.Shortcut` | — | — | |
| `autoFocus` | boolean | — | — | Focus when panel opens. |
| `style` | `Action.Style` | — | `Regular` | `Regular`/`Destructive`. |

### Built-in Actions (selected)

- `Action.CopyToClipboard` — `content`*, `concealed?`, `onCopy?`, …
- `Action.Paste` — `content`*, `onPaste?`
- `Action.OpenInBrowser` — `url`*, `onOpen?`
- `Action.Open` — `target`*, `title`*, `application?`, `onOpen?`
- `Action.OpenWith` — `path`*, `onOpen?`
- `Action.ShowInFinder` — `path`* (`fs.PathLike`)
- `Action.Push` — `target`* (ReactNode), `title`*, `onPush?`, `onPop?` (the recommended way to navigate)
- `Action.Trash` — `paths`* (`fs.PathLike | fs.PathLike[]`)
- `Action.SubmitForm` — `title`*, `onSubmit?: (input: Form.Values) => boolean | void | Promise<...>`, `style?`
- `Action.CreateSnippet` / `Action.CreateQuicklink` / `Action.ToggleQuickLook` / `Action.PickDate`

### ActionPanel

`children` (Sections or Actions; bare Actions get a default Section), `title`. Default shortcuts differ by container: List/Grid/Detail → `↵`/`⌘↵`; Form → `⌘↵`/`⌘⇧↵`.

`ActionPanel.Section` (`title`, `children`), `ActionPanel.Submenu` (`title`*, `children`, `filtering?`, `onOpen?`, `onSearchTextChange?`, `throttle?`, `isLoading?`, …).

```tsx
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Docs: Update API Reference"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
            <Action.CopyToClipboard title="Copy URL" content="https://github.com/raycast/extensions/pull/1" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### Form

| Prop | Type | Req | Default | |
|------|------|-----|---------|---|
| `actions` | ReactNode | — | — | ActionPanel with `Action.SubmitForm`. |
| `children` | ReactNode | — | — | Form items. |
| `enableDrafts` | boolean | — | `false` | Preserve values on exit (password fields excluded). |
| `isLoading` | boolean | — | `false` | Loading bar. |
| `navigationTitle` | string | — | command title | |
| `searchBarAccessory` | `<Form.LinkAccessory>` | — | — | |

Form items share `id`*, `title`, `error`, `focus()`/`reset()` (via ref). Items: `TextField`, `PasswordField`, `TextArea` (`enableMarkdown`), `Checkbox` (`label`*), `DatePicker` (`Form.DatePicker.Type` `Date`/`DateTime`; `Form.DatePicker.isFullDay()`), `Dropdown` (+ `.Item`/`.Section`), `TagPicker` (+ `.Item`), `FilePicker` (`canChooseFiles`/`canChooseDirectories`/`allowMultipleSelection`), `Description`, `Separator`, `LinkAccessory`.

Validation runs on `onBlur` → sets `error`; **submission is blocked if any field has an error.** Easiest with `useForm` (§11).

```tsx
import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

export default function Command() {
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    onSubmit(values) { console.log(values); },
    validation: { name: FormValidation.Required },
  });
  return (
    <Form actions={<ActionPanel><Action.SubmitForm title="Submit" onSubmit={handleSubmit} /></ActionPanel>}>
      <Form.TextField title="Name" {...itemProps.name} />
    </Form>
  );
}
```

### Navigation

`useNavigation()` → `{ push(component, onPop?), pop() }`. Prefer `Action.Push`; `ESC` pops automatically.

```tsx
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";

function Ping() {
  const { push } = useNavigation();
  return <Detail markdown="Ping" actions={<ActionPanel><Action title="Push" onAction={() => push(<Detail markdown="Pong" />)} /></ActionPanel>} />;
}
export default function Command() { return <Ping />; }
```

### Colors

`Color.ColorLike = Color | Color.Dynamic | Color.Raw`.

- `Color` enum (theme-adaptive): `Blue`, `Green`, `Magenta`, `Orange`, `Purple`, `Red`, `Yellow`, `PrimaryText`, `SecondaryText`.
- `Color.Dynamic`: `{ light: string; dark: string; adjustContrast?: boolean }`.
- `Color.Raw`: HEX `#FF0000`, short HEX `#F00`, `rgb(...)`, `hsla(...)`, keyword `red`.

### Icons & Images

`Image.ImageLike = URL | Asset | Icon | FileIcon | Image` (emoji strings also accepted).

```ts
interface Image { source: Image.Source; fallback?: Image.Fallback; mask?: Image.Mask; tintColor?: Color.ColorLike; }
// Image.Source: URL | Asset | Icon | { light: URL|Asset; dark: URL|Asset }
// Image.Fallback: Asset | Icon | { light: Asset; dark: Asset }
// Image.Mask: Circle ("circle") | RoundedRectangle ("roundedRectangle")
interface FileIcon { fileIcon: string; }
```

`tintColor` affects only non-transparent pixels (for monochrome icons). Bundled assets can ship an `@dark` variant. The `Icon` enum has hundreds of members (e.g. `Icon.Circle`, `Icon.Check`, `Icon.Xmark`) — the docs don't state an exact count.

### Keyboard

```ts
interface Keyboard.Shortcut { key: Keyboard.KeyEquivalent; modifiers: Keyboard.KeyModifier[]; }
type KeyModifier = "cmd" | "ctrl" | "opt" | "shift" | "alt" | "windows"; // "alt" === "opt"
```

Prefer `Keyboard.Shortcut.Common.*` presets (Copy, Save, Edit, New, Open, Refresh, Remove, …) for cross-platform consistency.

```tsx
<Action title="Open" shortcut={Keyboard.Shortcut.Common.Open} onAction={() => {}} />
```

---

## 10. Window Management, Browser Extension, OAuth, AI

> `AI` and `WindowManagement` are **Raycast Pro-gated** — guard with `environment.canAccess(API)` (pass the namespace object, not a string). `WindowManagement` and `BrowserExtension` are **macOS-only**.

### Window Management — what it can't do for this project

```ts
WindowManagement.getActiveWindow(): Promise<Window>;
WindowManagement.getWindowsOnActiveDesktop(): Promise<Window[]>;
WindowManagement.getDesktops(): Promise<Desktop[]>;
WindowManagement.setWindowBounds(options): Promise<void>; // bounds object or "fullscreen"
```

`Window` exposes `id`, `active`, `bounds | "fullscreen"`, `desktopId`, `positionable`, `resizable`, `fullScreenSettable`, `application?`. **Important for this project:** it can only **move/resize/fullscreen existing windows — it cannot create a window or a fullscreen overlay**, and it's Pro-gated. It is *not* the tool for blacking out the screen.

### Browser Extension

```ts
BrowserExtension.getContent(options?: { cssSelector?: string; tabId?: number; format?: "html"|"text"|"markdown" }): Promise<string>;
BrowserExtension.getTabs(): Promise<Tab[]>; // Tab: { id; url; active; favicon?; title? }
```

Requires the companion Raycast browser extension; `cssSelector` is incompatible with `format: "markdown"`.

### OAuth

Low-level `OAuth.PKCEClient` (PKCE flow only; non-PKCE providers use the proxy `https://oauth.raycast.com`):

```ts
new OAuth.PKCEClient(options: { providerName: string; redirectMethod: OAuth.RedirectMethod; providerIcon?; providerId?; description? });
authorizationRequest(options): Promise<AuthorizationRequest>;
authorize(options): Promise<AuthorizationResponse>;
setTokens(options): Promise<void>;   // accepts camelCase TokenSetOptions OR snake_case TokenResponse
getTokens(): Promise<TokenSet | undefined>;
removeTokens(): Promise<void>;
```

Prefer the `@raycast/utils` helpers (§11): `OAuthService` (+ provider presets), `withAccessToken`, `getAccessToken`. (Not relevant to this project.)

### AI

```ts
async function ask(prompt: string, options?: { creativity?: AI.Creativity; model?: AI.Model; signal?: AbortSignal }): Promise<string> & EventEmitter;
type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number; // 0–2, clamps
```

The returned value is a Promise **and** an EventEmitter — `await` for the final string, or `answer.on("data", …)` to stream (don't await first when streaming). Default model: OpenAI GPT-4o mini. Rate limits: 10/min, 100/hour per user. `AI.Model` membership changes frequently — reference `AI.Model.<Member>` from the installed typings rather than hardcoding strings.

```tsx
import { AI, Clipboard } from "@raycast/api";
const answer = await AI.ask("Suggest 5 jazz songs");
await Clipboard.copy(answer);
```

---

## 11. @raycast/utils — hooks & functions

Install: `npm install --save @raycast/utils` (peer dep on `@raycast/api`; this repo has `^2.2.1`). Import: `import { usePromise, useFetch, runAppleScript, showFailureToast } from "@raycast/utils";`

**Shared model.** Data hooks share `AsyncState<T>` (`{ isLoading, data, error }`), options (`execute`, `onError`, `onData`, `onWillExecute`, `failureToastOptions`, and for cached hooks `initialData`, `keepPreviousData`), and return `revalidate()` + `mutate()` (optimistic updates). **The `fn`/`url` is treated as constant — only changing the `args` array triggers revalidation.** Cached values must be JSON-serializable.

### usePromise

```ts
function usePromise<T>(fn: T, args?: Parameters<T>, options?: { abortable?; execute?; onError?; onData?; onWillExecute?; failureToastOptions? }):
  AsyncState<Result<T>> & { revalidate: () => void; mutate: MutatePromise<Result<T> | undefined> };
```

```tsx
const { isLoading, data } = usePromise(async (url: string) => (await fetch(url)).text(), ["https://api.example"]);
```

### useCachedPromise / useFetch

Stale-while-revalidate; persist across runs. `useFetch(url, options)` is built on `useCachedPromise` and accepts standard `RequestInit` plus `parseResponse`/`mapResult`. (Pagination caches only the first page.)

```tsx
const { isLoading, data, revalidate } = useFetch("https://api.example");
```

### useCachedState / useLocalStorage

```ts
function useCachedState<T>(key: string, initialState?: T, config?: { cacheNamespace?: string }): [T, (v: T | ((p: T) => T)) => void];
function useLocalStorage<T>(key: string, initialValue?: T): { value: T | undefined; setValue: (v: T) => Promise<void>; removeValue: () => Promise<void>; isLoading: boolean };
```

### useExec

```ts
function useExec<T, U>(file: string, args: string[], options?: { shell?; cwd?; env?; encoding?; input?; timeout?; parseOutput?; initialData?; keepPreviousData?; execute? }):
  AsyncState<T> & { revalidate; mutate };
// Overload: useExec(command: string, options?)
```

Prefer the **file+args** overload (auto-escapes). `shell: true` with user input is an injection risk (docs warn). Default `timeout` 10000ms (`0` disables).

### useSQL

```ts
function useSQL<T>(databasePath: string, query: string, options?: { permissionPriming?; execute?; ... }):
  AsyncState<T> & { revalidate; mutate; permissionView: React.ReactNode | undefined };
```

Requires Full Disk Access; `if (permissionView) return permissionView;` before rendering.

### useForm

```ts
function useForm<T extends Form.Values>(props: {
  onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  initialValues?: Partial<T>;
  validation?: { [id in keyof T]?: ((value: T[id]) => string | undefined | null) | FormValidation };
}): { handleSubmit; itemProps; setValidationError; setValue; values; focus; reset };
```

Spread `{...itemProps.field}` onto each item (supplies id/error/onChange/onBlur/value). `FormValidation.Required` is the documented member.

### useStreamJSON / useFrecencySorting / useAI

- `useStreamJSON(url, options)` — streams large JSON page-by-page; wrap `filter`/`transform` in `useCallback` (identity change → refetch).
- `useFrecencySorting(data?, options?)` → `{ data, visitItem, resetRanking }` (frequency + recency sort).
- `useAI(prompt, options?)` → `AsyncState<string> & { revalidate }`.

### runAppleScript (macOS only) — key for native automation

```ts
function runAppleScript<T>(script: string, options?: {
  humanReadableOutput?: boolean; // default true
  language?: "AppleScript" | "JavaScript"; // JXA
  signal?: AbortSignal; timeout?: number; // default 10000ms; 0 disables
  parseOutput?: ParseExecOutputHandler<T>;
}): Promise<T>;
// Overload: runAppleScript(script, arguments: string[], options?) — args via `on run argv` / `item N of argv`
```

```tsx
import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function () {
  const res = await runAppleScript(`on run argv\n  return "hello, " & item 1 of argv & "."\nend run`, ["world"]);
  await showHUD(res);
}
```

AppleScript that drives other apps triggers macOS **Automation** prompts for Raycast. (For Windows, `runPowerShellScript` is the analog.)

### Other functions

- `showFailureToast(error, options?)` — see §6.
- `executeSQL<T>(databasePath, query): Promise<T[]>` — one-shot query.
- `createDeeplink(options): string` — `DeeplinkType.Extension` (intra/external) or `DeeplinkType.ScriptCommand`.
- `withCache(fn, { validate?, maxAge? })` — caches an async fn; adds `.clearCache()`.
- Icon generators: `getProgressIcon(progress, color?, options?)`, `getAvatarIcon(name, options?)`, `getFavicon(url, options?)` — all return `Image.Asset`/`Image.ImageLike`. (Note `getFavicon`'s `size` is a number despite a doc typo showing `boolean`.)
- OAuth: `OAuthService` (+ `.github`/`.google`/`.slack`/`.asana`/`.linear`/`.jira`/`.zoom` presets), `withAccessToken({ authorize })`, `getAccessToken()` (must run inside a `withAccessToken`-wrapped tree; token is global, not a prop).

---

## 12. AI Extensions & Tools

This repo has `tools: []` and no `ai` config, so it is **not** an AI extension. Reference only.

An AI Extension exposes **tools** (functions Raycast AI calls in Quick AI / AI Chat / AI Commands), **instructions** (extension-wide system guidance), and **evals** (integration tests that double as suggested prompts). Requires Raycast Pro; not available on Windows.

A tool is a file whose **default export** is a function taking a single typed `Input` object; the AI reads JSDoc on the function and each field to decide when/how to call it. Per the manifest reference, a tool `name` maps to `src/tools/<name>.ts`.

```ts
import { Tool } from "@raycast/api";

type Input = {
  /** The first name of the user to greet */
  name: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to greet ${input.name}?`,
});

/** Greet the user with a friendly message */
export default function tool(input: Input) {
  return `Hello, ${input.name}!`;
}
```

`Tool.Confirmation<T>` runs **before** the tool with the same input; returning `undefined` skips confirmation. Its return may include `style?` (use `Action.Style.Destructive` for irreversible actions), `info?: { name; value? }[]`, `message?`, `image?`.

Evals live under `ai.evals` (or `ai.yaml`): each has `input` (an `@`-mention prompt), **required** `mocks` (mocked tool results), `expected` (matchers: `includes` (case-insensitive), `matches` (regex), `meetsCriteria` (AI-validated), `callsTool` short/long form with `eq`/`includes`/`matches`/`and`/`or`/`not` argument matchers), and `usedAsExample` (default `true`). Run with `npx ray evals`.

---

## 13. Doing native macOS things

This is the crux for **this** extension. The two requirements — **(a) black out the whole screen** and **(b) disable keyboard input until a centered button is clicked** — are **not** achievable with the plain `@raycast/api` JS surface. Here's the full picture.

### 13.1 What the JS layer gives you

| Mechanism | Source | Reaches |
|-----------|--------|---------|
| `runAppleScript` (osascript) | `@raycast/utils` | Scriptable apps via AppleScript/JXA. Cannot create arbitrary windows or block input. |
| `child_process` (`exec`/`spawn`/`execFile`) + `useExec` | Node (unsandboxed) / `@raycast/utils` | Any CLI/subprocess. |
| **Swift native bridge** (`extensions-swift-tools`) | GitHub (not on developers.raycast.com) | **AppKit, CoreGraphics/CGEvent, Accessibility, window creation** — the only path that unlocks (a) and (b). |
| `WindowManagement` | `@raycast/api` (Pro, macOS) | Move/resize/fullscreen **existing** windows only. Cannot create a window/overlay. |

Because Raycast renders via AppKit with **no DOM**, you cannot build an HTML/CSS overlay, and no documented Raycast component paints a borderless fullscreen window outside Raycast's own command window.

### 13.2 The Swift native bridge

Documented in the GitHub repos [`raycast/extensions-swift-tools`](https://github.com/raycast/extensions-swift-tools) and the [sample](https://github.com/raycast/extensions-swift-sample) (the official docs site is silent; the changelog only confirms Swift extensions compile). Requires **Xcode installed**, **Swift 5.9+**, **macOS 12+**.

**Setup.** Create a Swift executable target (e.g. a `swift/` folder beside `src/`), delete the generated `main.swift` (no `@main`), and use:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "CustomName",
  platforms: [ .macOS(.v12) ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.5")
  ],
  targets: [
    .executableTarget(
      name: "CustomName",
      dependencies: [
        .product(name: "RaycastSwiftMacros",     package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin",      package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    ),
  ]
)
```

**Define an exportable function** — must be **global**, params `Decodable`, return `Encodable`/`Void`; `async`/`throws` supported; no variadics/parameter packs:

```swift
import Foundation
import RaycastSwiftMacros

@raycast func greeting(name: String, isFormal: Bool) -> String {
  "Hello \(isFormal ? "Mr/Ms" : "") \(name)!"
}

@raycast func delayedGreeting(name: String, seconds: Double) async throws -> String {
  guard seconds >= .zero else { throw CancellationError() }
  try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
  return "... Hello \(name)!"
}
```

**Call it from TypeScript** via the `swift:` import scheme (every imported fn returns a Promise):

```tsx
import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { delayedGreeting } from "swift:../swift";

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => delayedGreeting("Test Dummie", 3));
  return <Detail isLoading={isLoading} markdown={data || (error && `Error: ${error.message}`) || "Loading..."} />;
}
```

Build via Raycast "Manage Extensions" → "Start Development" (⌘B), which runs the build plugins that validate the Swift and generate the type-safe TS interface. (The `.gitignore` in this repo already excludes the Swift build artifacts — `.raycast-swift-build`, `.swiftpm`, `compiled_raycast_swift` — consistent with shipping a Swift target.)

### 13.3 How THIS extension would implement (a) and (b)

> The following is the realistic native design. The Swift/AppKit/CGEvent calls are **not** Raycast APIs — they're standard macOS frameworks reached through the bridge.

**(a) Black out the whole screen.** In a `@raycast` Swift function, create a borderless `NSWindow` **per `NSScreen`** (iterate `NSScreen.screens` for multi-monitor) with:
- `window.level = .screenSaver` (or `.mainMenu + 1`) so it floats above everything including the menu bar,
- `backgroundColor = .black`, `isOpaque = true` (or an alpha for "darken" rather than full black),
- `collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]`,
- then `makeKeyAndOrderFront`.

This **needs no Screen Recording permission** — you are *drawing* a black window, not *capturing* pixels. (Capturing/blurring the real screen content *would* require Screen Recording.)

**(b) Disable keyboard input until the centered button is clicked.** Two levels:
1. **Simplest/safest (no special permission):** make the overlay window `canBecomeKey = true`, key and modal-like, with the centered `NSButton` as the only focusable control. A `screenSaver`-level key window swallows most keystrokes from other apps while it is key.
2. **Strong/global blocking:** install a **CGEvent tap** (`CGEvent.tapCreate` with `.cgSessionEventTap`, listening for `keyDown`/`keyUp`/`flagsChanged`) and return `nil` from the callback to consume events system-wide; tear it down on the button click. **Consuming events via a tap REQUIRES Accessibility permission** (System Settings → Privacy & Security → Accessibility) — granted to **Raycast** (the parent process), not the extension. Without it, the tap is created but cannot suppress keystrokes. Note: the system reserves some hardware combos; a screenSaver-level key window plus a CGEvent tap is the practical user-space maximum.

The centered "Done"/"Restore" `NSButton`'s action **tears down the overlay window(s) and removes the CGEvent tap**, then resolves the `@raycast` async function's Promise back to TypeScript, at which point the no-view command finishes (e.g. `await showHUD("Screen and keyboard restored")`).

**Lifecycle caveat (important).** A Raycast command's JS lifecycle is short-lived; when the command finishes, JS-side state is gone. So the persistent overlay must be **owned/retained on the Swift side** — its own `NSWindow` + run loop (often keeping an `NSApplication`/run loop alive) — and the `@raycast async` function should resolve **only when the user clicks the dismiss button**. That's why the TS default export `await`s the native call (§5.2) and the Swift function is `async`.

### 13.4 Permissions summary (granted to the Raycast app, not the extension)

| Permission | Needed for | Where granted |
|------------|-----------|---------------|
| **Accessibility** | Consuming/suppressing input via a CGEvent tap (keyboard blocking); posting events to other apps | System Settings → Privacy & Security → Accessibility → Raycast |
| **Screen Recording** | Only if you *capture* screen pixels (not needed to merely draw a black overlay) | … → Screen Recording → Raycast |
| **Automation** | AppleScript/JXA controlling another app | Prompted per target app for Raycast |

The extension inherits these because it runs inside Raycast's process tree.

### 13.5 Bottom line for this repo

- Keep the command `no-view` (nothing to render in Raycast's window).
- Add a Swift target via `extensions-swift-tools`; implement `startCleaningMode()` (or similar) as a global `@raycast async` function that creates per-screen black `NSWindow`s, installs a CGEvent tap (Accessibility required for real blocking), shows the centered dismiss button, and resolves on click.
- From `src/clean-keyboard-and-screen.ts`, `import { startCleaningMode } from "swift:../swift"`, `await` it inside the default `async` export, then `showHUD` on completion and `showFailureToast` on error.
- Document the required **Accessibility** permission prominently in the README (and explain that full keyboard blocking depends on it).

---

## 14. Debugging, best practices, Store, publishing, security, versioning

### Debugging & dev loop

- `npm run dev` (`ray develop`): top-of-search placement, hot reload (toggleable), detailed stack traces in error overlays, terminal logs, build-error indicators, auto-import. Stop with `⌃C` (extension stays installed).
- `captureException(e)` reports caught errors to the **Developer Hub** for published extensions.
- Validate a production build with `npx ray build -e dist`.
- Lint with `npm run lint` / auto-fix `npm run fix-lint`.
- For OAuth flows specifically, disable auto-reload while an authorization is in progress.

### Best practices

- Choose the right `mode`: `no-view` for run-and-finish (this project), `view` for UI, `menu-bar` for ambient status.
- In `no-view`/background commands, branch on `environment.launchType` to avoid showing UI during background runs; set `MenuBarExtra` `isLoading` to `false` to allow unload.
- Use `Cache` for recomputable data, `LocalStorage` for durable data, `node:fs` under `environment.supportPath` for large files.
- Prefer `useExec`'s file+args form over `shell: true`; never interpolate untrusted input into a shell command.
- Gate Pro APIs (`AI`, `WindowManagement`) with `environment.canAccess`.
- For AI extensions: use confirmations for side-effects, write evals, and describe parameter formats/acquisition in inputs.

### Preparing for the Store

- `author`: your Raycast username. `license`: `MIT`. `icon`: 512×512 PNG (+ `icon@dark.png`). `platforms` reflecting actual support (this repo: `["macOS"]`, correct since it's macOS-only native work). Include a `package-lock.json`.
- Provide a `README.md`, a `CHANGELOG.md`, and screenshots/metadata as the Store requires.
- **For this extension specifically**, the README should state the **Accessibility** permission requirement and the multi-monitor blackout behavior, since reviewers/users will hit the permission prompt.

### Publishing flow

```bash
npm run publish   # → npx @raycast/api@latest publish  (verifies, builds, publishes to the Raycast Store)
```

The `prepublishOnly` guard deliberately fails an accidental `npm publish`. If the extension has an `owner` and no public `access`, `ray publish` targets the org's private store.

### Security model (recap)

- Each extension runs in its own v8 isolate inside Raycast's single Node child process; RPC exposes only a defined set of Raycast operations.
- Extensions are **not** further sandboxed for file I/O, networking, or Node features — `child_process`/`fs`/`net` are available.
- macOS privacy permissions (Accessibility, Screen Recording, Automation) attach to **Raycast (the parent process)**, granted in System Settings → Privacy & Security; the extension inherits them.

### Versioning

- Strict minimums: Raycast ≥ 1.26.0, Node ≥ 22.14, npm ≥ 7.
- This repo pins `@raycast/api ^1.103.0`, `@raycast/utils ^2.2.1`. A given `@raycast/utils` version requires a minimum `@raycast/api`; npm warns on mismatch.
- `ray migrate` bumps to the latest `@raycast/api`.
- `extensions-swift-tools` is versioned independently (`from: "1.0.5"` in `Package.swift`); requires Xcode + Swift 5.9 + macOS 12.

---

## 15. Sources

Official Raycast documentation (developers.raycast.com) and the Swift bridge repos:

- Getting started: https://developers.raycast.com/basics/getting-started
- Create your first extension: https://developers.raycast.com/basics/create-your-first-extension
- File structure: https://developers.raycast.com/information/file-structure
- Manifest: https://developers.raycast.com/information/manifest
- CLI: https://developers.raycast.com/information/developer-tools/cli
- Developer tools: https://developers.raycast.com/information/developer-tools
- Lifecycle: https://developers.raycast.com/information/lifecycle
- Background refresh: https://developers.raycast.com/information/lifecycle/background-refresh
- Arguments: https://developers.raycast.com/information/lifecycle/arguments
- Deeplinks: https://developers.raycast.com/information/lifecycle/deeplinks
- Command API: https://developers.raycast.com/api-reference/command
- Menu bar commands: https://developers.raycast.com/api-reference/menu-bar-commands
- Environment: https://developers.raycast.com/api-reference/environment
- Feedback — HUD: https://developers.raycast.com/api-reference/feedback/hud
- Feedback — Toast: https://developers.raycast.com/api-reference/feedback/toast
- Feedback — Alert: https://developers.raycast.com/api-reference/feedback/alert
- Window & search bar: https://developers.raycast.com/api-reference/window-and-search-bar
- Utilities (System): https://developers.raycast.com/api-reference/utilities
- Clipboard: https://developers.raycast.com/api-reference/clipboard
- Cache: https://developers.raycast.com/api-reference/cache
- Storage (LocalStorage): https://developers.raycast.com/api-reference/storage
- Preferences: https://developers.raycast.com/api-reference/preferences
- UI — Form: https://developers.raycast.com/api-reference/user-interface/form
- UI — Actions: https://developers.raycast.com/api-reference/user-interface/actions
- UI — Action panel: https://developers.raycast.com/api-reference/user-interface/action-panel
- UI — Navigation: https://developers.raycast.com/api-reference/user-interface/navigation
- UI — Colors: https://developers.raycast.com/api-reference/user-interface/colors
- UI — Icons & Images: https://developers.raycast.com/api-reference/user-interface/icons-and-images
- Keyboard: https://developers.raycast.com/api-reference/keyboard
- Window management: https://developers.raycast.com/api-reference/window-management
- Browser extension: https://developers.raycast.com/api-reference/browser-extension
- OAuth: https://developers.raycast.com/api-reference/oauth
- AI: https://developers.raycast.com/api-reference/ai
- Tool: https://developers.raycast.com/api-reference/tool
- Utilities getting started: https://developers.raycast.com/utilities/getting-started
- Hooks: usePromise, useCachedPromise, useFetch, useCachedState, useLocalStorage, useExec, useSQL, useForm, useStreamJSON, useFrecencySorting, useAI (https://developers.raycast.com/utilities/react-hooks/…)
- Functions: runAppleScript, runPowerShellScript, showFailureToast, executeSQL, createDeeplink, withCache (https://developers.raycast.com/utilities/functions/…)
- Icons: getFavicon, getAvatarIcon, getProgressIcon (https://developers.raycast.com/utilities/icons/…)
- OAuth helpers: OAuthService, withAccessToken, getAccessToken (https://developers.raycast.com/utilities/oauth/…)
- AI extensions: https://developers.raycast.com/ai/getting-started · /ai/create-an-ai-extension · /ai/learn-core-concepts-of-ai-extensions · /ai/write-evals-for-your-ai-extension · /ai/follow-best-practices-for-ai-extensions
- Security: https://developers.raycast.com/information/security
- FAQ: https://developers.raycast.com/misc/faq
- Changelog: https://developers.raycast.com/misc/changelog
- Prepare for Store: https://developers.raycast.com/basics/prepare-an-extension-for-store
- Swift native bridge: https://github.com/raycast/extensions-swift-tools · https://github.com/raycast/extensions-swift-sample · https://www.raycast.com/blog/automate-your-mac-with-swift
