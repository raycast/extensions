# Raycast Extension Development Reference

Research notes for building the `hackclub-cdn` Raycast extension: upload files to a CDN,
copy resulting links to the clipboard, accept a file via pasted path / file picker / Finder
selection, show a "recently uploaded" list, and eventually publish to the Raycast Store.

---

## 1. Extension Anatomy: `package.json` Manifest

The manifest is a regular `package.json` with Raycast-specific fields.

### Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Unique, URL-compatible extension identifier |
| `title` | string | Yes | Display name in Store/search |
| `description` | string | Yes | Full description shown in Store |
| `icon` | string | Yes | PNG, min 512×512px; supports `icon@dark.png` variant |
| `author` | string | Yes | Raycast Store username |
| `platforms` | array | Yes | `"macOS"` and/or `"Windows"` |
| `categories` | array | Yes | See allowed values below |
| `commands` | array | Yes | Array of command objects (see below) |
| `license` | string | No | e.g. `"MIT"` (required for Store publishing) |
| `preferences` | array | No | Extension-level preferences (shared across commands) |
| `tools` | array | No | Tools exposed to Raycast AI |
| `ai` | object | No | AI capability configuration |
| `owner` / `access` | string | No | Org identifier / `"public"` \| `"private"` (private extensions) |
| `contributors` / `pastContributors` | array | No | Maintainer usernames |
| `keywords` | array | No | Store search terms |
| `external` | array | No | Packages excluded from bundling |

Allowed `categories` values: `Applications, Communication, Data, Documentation, Design Tools, Developer Tools, Finance, Fun, Media, News, Productivity, Security, System, Web, Other` (Title Case, at least one required).

### Commands array

Each entry in `commands`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Maps to entry point file, e.g. `src/<name>.tsx` |
| `title` | string | Yes | Display name |
| `description` | string | Yes | Shown in Store/preferences |
| `mode` | `"view" \| "no-view" \| "menu-bar"` | Yes | See section 2 |
| `subtitle` | string | No | Usually the service/domain name |
| `icon` | string | No | Overrides extension icon (512×512 PNG) |
| `keywords` | array | No | Extra search terms |
| `arguments` | array | No | Typed launch arguments (see below) |
| `preferences` | array | No | Command-level preferences, override/extend extension-level |
| `disabledByDefault` | boolean | No | Only affects first install |
| `interval` | string | No | Background refresh cadence, e.g. `"90s"`, `"1m"`, `"12h"`, `"1d"` (used with `no-view`/`menu-bar` for periodic execution) |

**Arguments** (typed CLI-style inputs shown before running a command): each has `name`, `type` (`"text" | "password" | "dropdown"`), `placeholder`, `required` (default `false`), and `data` (array of `{title, value}`) for dropdowns.

### Preferences schema

Each preference object: `name`, `title`, `description`, `type` (`textfield | password | checkbox | dropdown | appPicker | file | directory`), `required`, `placeholder`, `default`, `label` (required for `checkbox`), `data` (required for `dropdown`, array of `{title, value}`).

Type → runtime value returned by `getPreferenceValues()`:

| type | Returned value |
|---|---|
| textfield | `string` |
| password | `string` (masked in UI, not logged) |
| checkbox | `boolean` |
| dropdown | `string` |
| appPicker | `Application` object |
| file | `string` (path) |
| directory | `string` (path) |

### Icon requirements

- PNG, minimum 512×512px.
- Provide `icon.png` + `icon@dark.png` for light/dark theme variants.
- Avoid using the default Raycast template icon (Store rejects this). Icon generator: `icon.ray.so`.

---

## 2. Command Modes: view / no-view / menu-bar

Set via `mode` in the manifest; also exposed at runtime as `environment.commandMode`.

- **`view`** — Renders a React UI (default export returns JSX using `List`, `Form`, `Detail`, etc.). Use for anything interactive: picking a file, showing a list of recent uploads, showing upload progress/detail.
- **`no-view`** — Default export is a plain async function with no UI; runs and exits (optionally showing a `Toast`/`HUD`). Good for quick actions like "Upload clipboard file and copy link" that shouldn't require navigating a UI. Can also be triggered on an `interval` for background work.
- **`menu-bar`** — Default export returns a `MenuBarExtra` tree rendered as a macOS menu bar item; has its own click-triggered entry point and can also refresh via `interval`. Useful for an always-available "recent uploads" quick-access menu or upload-status indicator.

For this extension, a sensible split: a `view` "Upload File" command (Form with FilePicker + drag-in via pasted path), a `no-view` "Upload Clipboard File" quick action, a `view` "Recent Uploads" List command, and optionally a `menu-bar` command surfacing the last few uploads/links.

---

## 3. Key UI Components

### List

Props include: `isLoading`, `filtering` (bool or `{keepSectionOrder}`), `isShowingDetail`, `navigationTitle`, `onSearchTextChange`, `onSelectionChange`, `pagination` (`{hasMore, onLoadMore, pageSize}`), `searchBarAccessory`, `searchBarPlaceholder`, `searchText`, `selectedItemId`, `throttle`.

`List.Item` props: `title` (string or `{value, tooltip}`), `subtitle`, `accessories` (`List.Item.Accessory[]`), `icon`, `id`, `keywords`, `actions`, `detail` (a `List.Item.Detail`), `quickLook` (`{name?, path}` — enables spacebar Quick Look preview, handy for previewing an uploaded file).

`List.Item.Detail` props: `markdown`, `metadata`, `isLoading` — use to show a right-hand preview pane (e.g. file thumbnail markdown + `Detail.Metadata` for size/date/link) when the recent-uploads item is selected.

`List.EmptyView`: `title`, `description`, `icon`, `actions` — customize instead of leaving the default blank state (Store guideline).

Built-in fuzzy filtering matches `title`/`keywords`; set `filtering={false}` to implement custom search behavior.

### Form (upload picker screen)

Field components (each has `id`, `title`, `value`/`defaultValue`, `onChange`, `error`, `info`, `storeValue`):

- **`Form.FilePicker`** — the key component for "pick a file to upload": props `allowMultipleSelection`, `canChooseFiles`, `canChooseDirectories`, `showHiddenFiles`, `value`/`defaultValue: string[]`, `onChange: (paths: string[]) => void`. Opens the native macOS file picker dialog. Selected paths are plain filesystem paths, so any `fs` API works on them afterward.
- `Form.TextField`, `Form.PasswordField`, `Form.TextArea` (supports `enableMarkdown`), `Form.Checkbox` (`label`), `Form.Dropdown`, `Form.DatePicker`, `Form.TagPicker`.
- Submit via `Action.SubmitForm` with `onSubmit(values)`; `values.<filePickerId>` is `string[]` of paths. If any field has a validation `error` set, `onSubmit` is not invoked.
- `useForm` hook (from `@raycast/utils`) gives structured validation (`FormValidation` constants + custom validators) instead of hand-rolled `onBlur`/`onChange` error state.

### Detail

Props: `markdown`, `isLoading`, `navigationTitle`, `actions`, `metadata`. `Detail.Metadata` children: `Label` (`title`, `text`, `icon`), `Link` (`title`, `text`, `target`), `TagList` (`title`, children `TagList.Item` with `text`/`color`/`icon`/`onAction`), `Separator`. Useful for an "upload detail" screen showing the CDN URL, file size, upload date, etc.

### Action / ActionPanel

`ActionPanel` groups `ActionPanel.Section`s (optionally `ActionPanel.Submenu`s). The first two actions in a panel get automatic default shortcuts: in List/Grid/Detail, `↵` (primary) and `⌘↵` (secondary); in Form, `⌘↵` and `⌘⇧↵`. Custom shortcuts are set per-action via the `shortcut: Keyboard.Shortcut` prop (`{modifiers: string[], key: string}`).

Relevant built-in actions: `Action.CopyToClipboard` (title/content/shortcut), `Action.Paste`, `Action.Push` (navigate to another view), `Action.SubmitForm`, `Action.Open`, `Action.OpenInBrowser`, `Action.ShowInFinder`, `Action.Trash`, plus generic `Action` (`title`, `icon`, `onAction`). For "recent uploads," expect: primary action copies the link, secondary opens it in browser, another reveals/trashes the local reference.

### Toast / showToast / showFailureToast

```ts
async function showToast(options: Toast.Options): Promise<Toast>;
```
`Toast.Options`: `title` (required), `message`, `style` (`Toast.Style.Success | Failure | Animated`), `primaryAction`, `secondaryAction`. Returned `Toast` object is mutable (`toast.style = ...; toast.title = ...`) so you can start with `Animated` ("Uploading…") and flip to `Success`/`Failure` when the request resolves — the standard pattern for async operations with visible progress.

`showFailureToast` (from `@raycast/utils`) is a convenience wrapper for catch blocks:
```ts
function showFailureToast(error: unknown, options?: { title?: string; primaryAction?: Toast.ActionOptions }): Promise<Toast>;
```
Default title "Something went wrong" if omitted.

### showHUD

```ts
async function showHUD(title: string, options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
```
Closes the Raycast main window and shows a brief compact confirmation banner at the bottom of the screen. Intended for the "closes Raycast after a successful clipboard-style action" pattern — e.g. a `no-view` "Upload Clipboard File → copy link → showHUD('Copied CDN link!')" flow. Use `showToast` instead when the UI should stay open (e.g., inside a `view` command as an upload progresses).

---

## 4. Clipboard API

```ts
namespace Clipboard {
  function copy(content: string | number | Content, options?: { concealed?: boolean }): Promise<void>;
  function paste(content: string | Content): Promise<void>;
  function read(options?: { offset?: number }): Promise<ReadContent>;
  function readText(options?: { offset?: number }): Promise<string | undefined>;
  function clear(): Promise<void>;

  type Content = { text: string } | { file: PathLike } | { html: string; text?: string };
  type ReadContent = { text: string } | { file?: string } | { html?: string };
}
```

- `Clipboard.copy({ file: "/path/to/upload.png" })` copies an actual file reference (e.g. so a user can paste it into Finder/Slack) — separate code path from copying text/a URL string.
- To detect **"did the user copy a file in Finder?"**, call `Clipboard.read()` and check whether the result has a `file` property (a path string) vs. only `text`/`html`. This is the mechanism for "paste a file path" support: read the clipboard, see if it's a file, and if so use that path directly instead of asking the user to type/select one.
- `offset` (0–5) lets you read from clipboard *history*, not just the current item.
- `concealed: true` on `copy()` prevents sensitive content (e.g., a signed/private CDN URL) from being recorded into clipboard history — worth considering if uploaded links can be sensitive.

---

## 5. Filesystem Access Patterns

- Extensions run in a real Node.js process and can use Node's `fs`, `fs/promises`, `path`, `os`, etc. directly — there is **no special Raycast file API layer**; you work with plain filesystem paths (from `Form.FilePicker`, clipboard file reads, or `getSelectedFinderItems()`).
- **`getSelectedFinderItems()`** (in `@raycast/api`, documented under "Environment"/System Utilities):
  ```ts
  async function getSelectedFinderItems(): Promise<FileSystemItem[]>;
  // FileSystemItem = { path: string }
  ```
  Returns the items currently selected in Finder. **Rejects the promise if Finder is not the frontmost application** — so this only works when the user has Finder focused with files selected before invoking the command; it can't reach into Finder's selection state arbitrarily/in the background. Wrap in try/catch and fall back to the file picker or clipboard-file detection when it rejects.
- Native file picker dialogs are exposed only through `Form.FilePicker` (a controlled form field, not an imperative "open dialog" call) — there is no separate imperative `showOpenDialog()`-style API; the picker is a form component you render.
- **Drag-and-drop of files onto the Raycast window is not a general extension capability.** Some extensions support dragging files *out of* Raycast into other apps (e.g. via Quick Look/Finder-item actions), and community feedback threads (raycast/extensions#18499) confirm dragging a file *into* the Raycast window/modal is not supported for arbitrary extensions today. Design around picker + clipboard-file detection + `getSelectedFinderItems()` instead of drag-and-drop.
- Accessing protected macOS directories (Documents, Desktop, Downloads under sandboxed TCC rules, screen recording, etc.) requires the standard macOS permission prompt the first time Raycast/the extension touches them, granted via System Settings → Privacy & Security, exactly like any other macOS app — not something the extension code controls.

---

## 6. Local Persistence: LocalStorage vs Cache vs Filesystem

| | LocalStorage | Cache | Raw filesystem (`environment.supportPath`) |
|---|---|---|---|
| API | `LocalStorage.getItem/setItem/removeItem/allItems/clear` (all async, return Promises) | `new Cache(options)` instance with sync `get/set/has/remove/clear/subscribe` | Node `fs`/`fs/promises` |
| Storage medium | Raycast's local **encrypted** database | Disk-backed, with in-memory index | Plain files on disk |
| Value types | `string \| number \| boolean` only | `string` only (serialize objects yourself, e.g. JSON) | Anything |
| Size guidance | "Not meant to store large amounts of data" (no hard number documented) | `capacity` option in bytes, **default 10 MB**, LRU eviction when exceeded | Unbounded (disk-limited) |
| Persistence scope | Shared across all commands in the extension; isolated from other extensions | Optional `namespace` to isolate per-command | Per-extension support directory |
| Best for | Small, structured user data (settings, small lists, todos) | Larger/derived data that's fine to evict/regenerate (API response caches) | Large blobs, arbitrary files, anything exceeding Cache's LRU model |

**Recommendation for "recently uploaded files" list:** a bounded list of upload records (filename, CDN URL, timestamp, size) is small structured data — `LocalStorage` (as a single JSON-stringified array under one key, or per-item keys) is the natural fit and is explicitly the documented use case ("storing user-related data, e.g. entered todos"). Reserve `Cache` for something like caching CDN API responses, and only drop to raw filesystem writes if you need to keep actual file blobs/thumbnails locally.

---

## 7. Preferences API

```ts
function getPreferenceValues<T>(): T;         // reads merged extension+command preferences
function openExtensionPreferences(): Promise<void>;
function openCommandPreferences(): Promise<void>;
```

- Preferences declared in the manifest (`preferences` at extension level, `preferences` inside a command for overrides/extras) are surfaced automatically in Raycast's built-in preferences UI — no custom settings screen needed.
- For an API key/token (needed to auth against the CDN service), declare a preference with `type: "password"`: it renders as a masked/secure input, is not written to logs, and is the documented pattern ("password preferences can be used to ask users for values such as access tokens"). Read it at runtime with `getPreferenceValues<Preferences>()`.
- Command-level preferences let a single extension have per-command config (e.g. a different upload folder/tag per command) while extension-level preferences (like the CDN API token) are shared across all commands.

---

## 8. OAuth Support

Raycast has first-class OAuth via `OAuth.PKCEClient`, using the PKCE flow ("the official recommendation for native clients that cannot keep a client secret"). Flow: extension initiates OAuth → Raycast shows an overlay → user completes the provider's consent page → provider redirects back to Raycast → extension exchanges the code for tokens.

```ts
new OAuth.PKCEClient(options: {
  providerName: string;         // shown in the overlay
  providerIcon?: Image.ImageLike; // min 64x64
  providerId?: string;          // disambiguates multiple clients in one extension
  description?: string;
  redirectMethod: OAuth.RedirectMethod; // Web | App | AppURI
});

client.authorizationRequest(options): Promise<AuthorizationRequest>; // gets challenge/verifier/state/redirectURI
client.authorize(options): Promise<AuthorizationResponse>;           // shows overlay, returns auth code
client.setTokens(options: TokenSetOptions | TokenResponse): Promise<void>; // securely stores tokens; auto-adds a "Logout" preference
client.getTokens(): Promise<TokenSet | undefined>;

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  idToken?: string;
  scope?: string;
  updatedAt: Date;
  isExpired(): boolean; // convenience check (needs expiresIn set)
}
```

Only relevant here if the CDN service supports OAuth; if it's a simple bearer-token API key, a `password`-type preference (section 7) is simpler and is the documented pattern for that case.

---

## 8b. Networking / HTTP Requests & File Uploads

- Extensions run in Node, so standard `fetch` (global in modern Node versions Raycast ships) or `node-fetch`/`axios`/etc. from npm all work — there's no Raycast-specific networking restriction; **networking is not sandboxed**.
- `@raycast/utils` provides three main data-fetching hooks for `view` commands:
  - **`useFetch(url, options)`** — thin wrapper around `fetch` with `RequestInit`-compatible options plus `parseResponse`, `mapResult`, `execute` (defer/conditional fetch), `onError`, `onData`, `keepPreviousData`, pagination support (pass a function instead of a URL string, returning `{data, hasMore?, cursor?}`). Returns `{data, isLoading, error, revalidate, mutate}`.
  - **`usePromise(fn, args, options)`** — wraps any async function (not just `fetch`) with the same loading/error/revalidate/mutate state machine; supports `abortable` (AbortController ref) and optimistic `mutate()`.
  - **`useCachedPromise(fn, args, options)`** — like `usePromise` but persists the last result **across command runs** (stale-while-revalidate: shows cached data immediately, then refreshes in the background). Good fit for "recent uploads" if backed by a remote API list rather than purely local storage.
  - The official docs do **not** show a canned multipart/form-data upload example for `useFetch`. Since it's `RequestInit`-based, standard patterns apply: build a Node `FormData`/`Blob` (or the `form-data` npm package) with the file's bytes read via `fs.readFile`/`fs.createReadStream`, and pass it as `body` with the correct `Content-Type: multipart/form-data; boundary=...` header (or omit the header and let `FormData` set it, depending on the runtime's `fetch` implementation). For a `no-view`/`view` command doing an upload, prefer plain `fetch`/`usePromise` (imperative flow you fully control with a mutable `Toast`) over `useFetch` (which is oriented at GET-style read/display) — reserve `useFetch`/`useCachedPromise` for listing/reading data from a CDN API, and use `usePromise` or raw async/await for the actual upload POST.

---

## 9. Environment / Runtime Details

`environment` object (`@raycast/api`):

| Property | Description |
|---|---|
| `appearance` | `"dark" \| "light"` |
| `assetsPath` | Absolute path to extension's bundled `assets/` |
| `supportPath` | Absolute path to a **writable per-extension support directory** — use this for any raw files you need to persist (not LocalStorage/Cache) |
| `commandMode` | `"view" \| "no-view" \| "menu-bar"` |
| `commandName` / `extensionName` / `ownerOrAuthorName` | Identity from manifest |
| `isDevelopment` | true when running via `ray develop`, false when Store-installed |
| `launchType` | `LaunchType.UserInitiated \| LaunchType.Background` (the latter for `interval`-triggered runs) |
| `raycastVersion` | Host app version |
| `textSize` | `"medium" \| "large"` |
| `canAccess(api)` | Feature/API access check |

Other environment-adjacent functions: `getSelectedFinderItems()` (section 5), `getSelectedText()` (rejects if no text selected in frontmost app).

**Node runtime & isolation model** (from Raycast's engineering blog / security docs):
- Raycast auto-downloads and manages its own bundled Node.js runtime (stored under `~/Library/Application Support/com.raycast.macos/NodeJS/runtime`, ~90MB) — you don't control or pin the Node version in the manifest; Raycast decides/updates it.
- Each extension runs isolated via Node **worker threads** (v8 isolates) inside a single Raycast-managed child process — separate JS engine/event loop and a heap-memory cap per extension, but this is for crash/memory isolation between extensions, **not a security sandbox**.
- Extensions are **not sandboxed** for file I/O or networking beyond the normal macOS permission model — i.e., they can read/write anywhere the current user/macOS permissions allow, and make arbitrary network requests. Raycast has explicitly said this "might change in the future." Standard macOS TCC prompts (Documents/Desktop/Downloads access, screen recording, etc.) still apply the first time protected resources are touched.
- Only a **defined set of Raycast APIs** is exposed to extension code via an internal RPC bridge to the parent process — you can't call arbitrary Raycast internals, only the documented `@raycast/api` surface.

---

## 10. Publishing to the Raycast Store

### Pre-publish checklist
- `name`/`title`/`description`/`icon`/`author`/`categories`/`license` (use `"MIT"`) all set; `platforms` matches actual capabilities.
- Latest `@raycast/api` version; `package-lock.json` committed (npm required, not yarn/pnpm lockfiles).
- Icon: 512×512 PNG, works in both light/dark, not the default template icon; no unused asset files left in `assets/`.
- **README.md** (root folder) required whenever setup/config/API tokens are needed; link any images from a `/media` subfolder. Shown to users as "About This Extension" during onboarding.
- **CHANGELOG.md** (root folder) using `## [Title] - {PR_MERGE_DATE}` (or `YYYY-MM-DD`) entries, Keep-a-Changelog style.
- **Screenshots**: 3–6, 2000×1250px, 16:10 aspect ratio, PNG, consistent background, no sensitive data/other apps visible; use Raycast's Window Capture feature (1.37.0+).
- Naming: extension title in Apple-style Title Case, nouns not verbs, avoid overly generic names; command titles as `<Verb> <Noun>` (e.g. "Upload File", not "CDN"); subtitle carries the service name if not already in the title.
- Prohibited: external analytics, keychain access requests, shipping opaque compiled binaries without source, custom/non-Navigation-API screen stacks, non-English-only UI.
- UX conventions expected by reviewers: use the Preferences API (not custom onboarding screens) for credentials, Title Case action titles, icons on actions, ellipses (`…`) for actions that open submenus/forms, proper empty states (no flicker), text field placeholders, `isLoading` used correctly on top-level view components.

### CLI (`@raycast/api` bundles a `ray` binary, invoked via `npx ray ...` / the `npm run` scripts scaffolded into `package.json`)
- `ray develop` (→ `npm run dev`): dev mode — extension pinned to top of root search, hot-reload on save (toggle: Raycast Preferences → Advanced → "Auto-reload on save"), richer error overlays with stack traces.
- `ray build` (→ `npm run build`): produces the optimized production bundle; this is what Raycast's CI runs to actually publish. `ray build -e dist` is used to validate the extension builds cleanly before submitting.
- `ray lint` (→ `npm run lint`): runs Raycast's opinionated ESLint config for extensions (already wired into the scaffolded `eslint.config.js`).
- `npm run publish` → runs `ray publish` under the hood: authenticates via GitHub, forks/pushes to `raycast/extensions`, and opens (or updates, on re-run) a PR automatically. Manual alternative: fork `raycast/extensions` yourself, add the extension folder, and open a PR by hand.

### Review process
- After the PR is opened, Raycast's Community Managers review it against the Extension Guidelines; they request changes via PR review comments if something doesn't meet the bar. Once approved and merged, the extension auto-publishes to the Store.
- **No documented fixed SLA/turnaround time** was found in the official docs — expect it to vary with reviewer bandwidth and how many review rounds are needed; budget for at least one round of requested changes on a first submission, especially anything that touches credentials/security (a file-upload/CDN-token extension is likely to get scrutiny on how the token is requested/stored — use the `password` preference type, not a custom login form).

---

## 11. Common Patterns & Best Practices

- **Error handling**: wrap async work in try/catch; show a mutable `Toast` (start `Animated`, resolve to `Success`/`Failure`) rather than letting exceptions bubble to a generic crash screen. Use `showFailureToast(error, {title})` from `@raycast/utils` for a one-line catch-block reporter. For expected failure modes (offline, bad token, file too large) show a specific message, not a raw stack trace; where sensible, fall back to previously cached data instead of a hard error.
- **Loading states**: render the view immediately (don't block on data before first paint) and drive the `isLoading` prop on `List`/`Form`/`Detail`/`Grid` while async data loads, rather than returning `null`/blank until ready — avoids the "flickering empty state" antipattern flagged in the guidelines.
- **Keyboard shortcuts**: rely on the automatic default shortcuts (`↵`/`⌘↵` in List/Detail, `⌘↵`/`⌘⇧↵` in Form) for the first two actions in a panel, add explicit `shortcut={{modifiers, key}}` for anything else the user should be able to trigger without opening the action panel (e.g. `⌘C` to re-copy a link).
- **Deep linking**: `createDeeplink({command, arguments, launchType, ...})` builds a `raycast://` URL that can re-invoke a specific command (optionally in another extension) with prefilled arguments/context — useful for "copy a deep link to re-open this exact upload" or wiring into `MenuBarExtra` items/quicklinks.
- **Background refresh**: set `interval` on a `no-view` or `menu-bar` command to have Raycast periodically invoke it (`environment.launchType === LaunchType.Background` during those runs) — a way to, e.g., prune an old "recent uploads" cache or refresh a status menu without user action.
- **Menu bar pattern**: `MenuBarExtra` (`icon`, `title`, `tooltip`, `isLoading`, children `MenuBarExtra.Item`/`Section`/`Submenu`) — keep `isLoading` accurate (must go `true`→`false` around async work) or Raycast may unload the command mid-task.

---

## 12. Limitations & Gotchas for a File-Upload Extension

1. **No native drag-and-drop into Raycast.** You cannot let users drag a file from Finder onto the Raycast window/command as an input mechanism today — plan the input UX around `Form.FilePicker`, clipboard-file detection (`Clipboard.read()` → `.file`), and `getSelectedFinderItems()` instead.
2. **`getSelectedFinderItems()` only works when Finder is frontmost** and rejects otherwise — don't rely on it as a silent background check; use it as one of several input paths with a try/catch fallback.
3. **Extensions are not sandboxed** beyond normal macOS permissions — full filesystem and network access is available, which is convenient for this use case (reading arbitrary local files to upload) but means you're fully responsible for validating paths/sizes and not leaking the CDN token; Raycast reviewers will scrutinize credential handling on submission.
4. **LocalStorage is explicitly documented as unsuitable for large data** and only stores `string | number | boolean` — do not stash uploaded file bytes or large blobs there; keep it to small JSON-serializable metadata (recent-uploads index), and use `environment.supportPath` + `fs` for anything bigger, or just don't persist file bytes locally at all (only the resulting CDN URL/metadata).
5. **Cache has a default 10MB capacity** with LRU eviction — fine for API response caching, not for retaining uploaded file content.
6. **`Clipboard.copy`/`read` file support is path-based**, not raw bytes — copying "a file" to the clipboard means referencing it by path (`{file: PathLike}`), so the file must still exist on disk at that path for other apps to paste it.
7. **No documented multipart/form-data helper** in `@raycast/utils`/`@raycast/api` — you'll assemble the upload request yourself with Node's `FormData`/`fetch` or a library; test upload behavior directly rather than assuming `useFetch` handles it out of the box.
8. **No fixed Node version pinning** — Raycast manages/updates its bundled Node runtime itself, so don't assume a specific Node version beyond what current Raycast ships; avoid relying on very new or very old Node-specific APIs without checking compatibility.
9. **Store review is manual/human** with no published SLA — factor review latency into any "ship by X" planning, and get preferences/credential UX right the first time (use `password`-type preference, not a custom form) since that's a common source of requested changes.
10. **Single-language requirement**: the Store guidelines call for US English only UI text — don't build in i18n/localization switching as a feature for the initial Store submission.
11. **`Clipboard.read()`'s `file` field is a `file://` URI, not a plain filesystem path.** Confirmed empirically (not just from docs) by copying a real file in Finder and inspecting the raw pasteboard directly with `pbpaste -Prefer public.file-url`, which returned `file:///private/tmp/.../clip-test.txt` — a genuine URI, percent-encoded for special characters (e.g. spaces become `%20`). Passing this string straight to `fs.readFileSync()` fails with `ENOENT`, since Node doesn't treat a `file://` string as a path unless you convert it first. Fix: run the value through Node's built-in `url.fileURLToPath()` before using it with any `fs` function; this also applies to file references synthesized by macOS/Raycast for clipboard image data (e.g. a screenshot), which showed up as `file:///var/folders/.../T/Image (996).png`-style temp paths in the same URI format. Since this is universal for both real Finder copies and clipboard image data, always normalize `Clipboard.read().file` before using it, rather than special-casing one source.
12. **Node's native `fetch`/`FormData`/`Blob` can silently produce a broken multipart body.** `undici` (Node's built-in `fetch` implementation) omits the trailing `\r\n` after the final multipart boundary delimiter for Node versions 18.0.0 through 23.6.0 (fixed in undici 7.1.0+ / Node 24+). Some servers reject or mishandle a request missing that trailing CRLF — in one real case this manifested as a raw network-level failure (not even a clean HTTP error response), which is easy to misdiagnose as "something is wrong with my upload logic" rather than "the runtime's multipart serialization is spec-incomplete." Since Raycast auto-manages its own bundled Node version (item 8 above) and extension authors don't control which one a given user's Raycast install has, don't rely on native `FormData`/`Blob` for multipart file uploads if broad compatibility matters — build the multipart body manually as a `Buffer` with an explicit, correctly-terminated boundary sequence (`--{boundary}\r\n...\r\n\r\n{file bytes}\r\n--{boundary}--\r\n`), and set the `Content-Type: multipart/form-data; boundary=...` header yourself.
13. **Verification techniques beyond unit tests with mocks.** Mocking `@raycast/api` (e.g. `Clipboard.read`) only verifies your own code's logic is internally consistent with whatever the mock returns — it cannot catch cases where the real host behaves differently than assumed (exactly what happened with items 11 and 12 above; both slipped past a full unit test suite). Two techniques that catch this class of bug without needing Raycast's GUI:
    - **Inspect the real macOS pasteboard directly**, outside Raycast entirely, with `osascript`/`pbpaste`. `osascript -e 'clipboard info'` shows the actual UTI types present (e.g. `«class furl»` for a file reference); `pbpaste -Prefer public.file-url` reads the raw `file://` URL string for a file reference, exactly as it exists on the pasteboard, independent of any Raycast API layer. You can even synthesize a Finder-style file copy programmatically for testing: `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "/path/to/file")'`.
    - **Exercise the actual library code against the real external API**, outside Raycast, using `npx tsx some-script.ts` (since files like `src/lib/cdnClient.ts` have no `@raycast/api` dependency, they run standalone under `tsx`). This validates the real wire-level behavior (e.g. does the live CDN actually accept the manually-built multipart body?) rather than just a mocked `fetch`. Useful for one-off verification; not a substitute for the project's checked-in automated test suite.

---

## Sources

- https://developers.raycast.com/information/manifest
- https://developers.raycast.com/api-reference/user-interface/list
- https://developers.raycast.com/api-reference/user-interface/form
- https://developers.raycast.com/api-reference/user-interface/detail
- https://developers.raycast.com/api-reference/user-interface/action-panel
- https://developers.raycast.com/api-reference/feedback/toast
- https://developers.raycast.com/api-reference/feedback/hud
- https://developers.raycast.com/api-reference/clipboard
- https://developers.raycast.com/api-reference/storage
- https://developers.raycast.com/api-reference/cache
- https://developers.raycast.com/api-reference/preferences
- https://developers.raycast.com/api-reference/oauth
- https://developers.raycast.com/api-reference/environment
- https://developers.raycast.com/api-reference/menu-bar-commands
- https://developers.raycast.com/utilities/react-hooks/usefetch
- https://developers.raycast.com/utilities/react-hooks/usepromise
- https://developers.raycast.com/utilities/react-hooks/usecachedpromise
- https://developers.raycast.com/utilities/functions/showfailuretoast
- https://developers.raycast.com/utilities/functions/createdeeplink
- https://developers.raycast.com/information/best-practices
- https://developers.raycast.com/information/security
- https://developers.raycast.com/information/developer-tools/cli
- https://developers.raycast.com/basics/prepare-an-extension-for-store
- https://developers.raycast.com/basics/publish-an-extension
- https://www.raycast.com/blog/how-raycast-api-extensions-work
- https://manual.raycast.com/extensions-guidelines
- https://github.com/raycast/extensions/issues/18499 (drag-and-drop-into-Raycast limitation discussion)
- https://github.com/raycast/extensions/issues/153 (getSelectedFinderItems background)
- https://philna.sh/blog/2025/01/14/troubles-with-multipart-form-data-fetch-node-js/ (undici missing-trailing-CRLF multipart bug, Node 18.0.0-23.6.0, fixed in undici 7.1.0+/Node 24+)
- Direct empirical testing performed in this project: `pbpaste -Prefer public.file-url` pasteboard inspection (item 11 above) and a live `npx tsx` run of `src/lib/cdnClient.ts` against the real `cdn.hackclub.com` API (item 12 above), both on 2026-07-02/03
