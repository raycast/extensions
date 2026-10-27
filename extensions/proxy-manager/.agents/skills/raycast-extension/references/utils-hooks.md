# @raycast/utils: hooks, functions, OAuth, changelog, FAQ

> Distilled from developers.raycast.com Utilities pages, Changelog, Migration, FAQ (API 2.5.0, @raycast/utils 2.3.0). Tags like `[Manifest]` name the source page. When a fact looks stale, re-check it live: `curl -s 'https://developers.raycast.com/readme.md?ask=<question>'`, or grep the full dump (`curl -sL https://developers.raycast.com/llms-full.txt` plus `/llms-full.txt/1`).

## Hook picker (which to use when)
- [usePromise] no cache between runs; use for mutations-heavy or non-serializable results. Fn assumed CONSTANT: changing fn identity does NOT re-run; only `args` changes do.
- [useCachedPromise] stale-while-revalidate; last value persisted between command runs; result MUST be JSON-serializable (Dates etc. break). Default for dynamic list data.
- [useFetch] useCachedPromise + fetch in one; default parse = `response.json()` if JSON Content-Type else `response.text()`; override with `parseResponse`, reshape with `mapResult` (returns `{ data }`). Proxy-compatible (1.45.0).
- [useExec] useCachedPromise around a child process (cached, SWR). Prefer over manual execFile when output feeds a view.
- [useSQL] local SQLite read (e.g. Apple Notes/Messages DB); returns `permissionView` for Full Disk Access priming. NOT cached like useCachedPromise (only usePromise options).
- [executeSQL] non-hook variant for no-view commands: `executeSQL<T>(dbPath, query): Promise<T[]>`.
- [useStreamJSON] huge JSON arrays (http/https/`file:///`) streamed from support-folder cache; built-in pagination; `pageSize` default 20.
- [useAI] `useAI(prompt, { creativity 0–2, model, stream=true, execute })` → `data` string; Raycast Pro.
- [useCachedState] `useState` persisted across runs + shared across components/commands by same key.
- [useLocalStorage] async LocalStorage wrapper with `isLoading`.

## Shared options (usePromise family: usePromise/useCachedPromise/useFetch/useExec/useSQL/useAI/useStreamJSON)
- [usePromise] `execute: false` = define hook now, run later (e.g. waiting on user input); initial `isLoading` is `false` when execute=false.
- [usePromise] `onError` DEFAULT = log + generic failure toast ("Failed to fetch latest data") with a Retry action. Passing `onError` REPLACES that toast.
- [usePromise] `failureToastOptions: Partial<Pick<Toast.Options,"title"|"primaryAction"|"message">>` customizes default toast without writing onError (utils v1.16.0; fixed for useExec/useStreamJSON v1.16.5).
- [usePromise] `onData(data)`, `onWillExecute(args)` callbacks.
- [usePromise] `abortable: useRef<AbortController>()` — hook aborts previous call when a new one starts; pass `abortable.current?.signal` into fetch yourself.
- [usePromise] returns `{ data, error, isLoading, revalidate, mutate, pagination? }`. Reloading state keeps old `data` AND old `error` while `isLoading: true`.
- [useCachedPromise] `initialData` = value when cache empty (type U; data typed `T | U`). Use `initialData: []` to avoid `data?.map`.
- [useCachedPromise] `keepPreviousData: true` — on arg change with no cache for new args, keep last data instead of flashing initialData. Use with search-text-driven Lists + `throttle`.
- [useCachedState/useCachedPromise/useFetch/useExec/useStreamJSON] `cacheWriteDebounce: number` (ms) debounces cache writes to reduce memory pressure (utils v2.3.0).
- [useCachedState] `useCachedState<T>(key, initialState?, { cacheNamespace?, cacheWriteDebounce? }): [T, setter]` — setter accepts updater fn.

## mutate / optimistic updates
- [usePromise] signature:
  ```ts
  mutate(asyncUpdate?: Promise<any>, {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T); // default: auto-rollback to pre-optimistic value
    shouldRevalidateAfter?: boolean;              // default true (refetch after update)
  }): Promise<any>
  ```
- [usePromise] `mutate` rethrows the update's error — wrap in try/catch and set toast Failure there; rollback happens automatically.
- [usePromise] pattern: `await mutate(api.toggle(id), { optimisticUpdate: (d) => d.map(x => x.id===id ? {...x, done:!x.done} : x) })` — replaces separate `revalidate()` call (mutate revalidates by default).
- [utils changelog v2.0.0] optimistic mutate before first fetch finishes aborts the in-flight fetch (avoids race).
- [utils changelog v1.13.3] optimisticUpdate works beyond page 1 in paginated hooks.
- [useAI] no `mutate` (only revalidate). [useStreamJSON] has mutate.

## Pagination
- [usePromise] enable by making fn RETURN an async fn taking PaginationOptions:
  ```ts
  const { data, isLoading, pagination } = useCachedPromise(
    (q: string) => async ({ page, lastItem, cursor }) => {
      const r = await api.search(q, cursor);
      return { data: r.items, hasMore: !!r.next, cursor: r.next };
    },
    [searchText],
    { keepPreviousData: true },
  );
  <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
  ```
- [usePromise] `page` is 0-indexed; resets on `revalidate()`. `data` returned by hook = all pages concatenated (each page's `data` must be an array).
- [useCachedPromise] when paginating, ONLY FIRST PAGE is cached.
- [useFetch] paginated form: `url` becomes `(options) => RequestInfo`; `mapResult` becomes REQUIRED and returns `{ data: any[], hasMore?, cursor? }`. Remember `page + 1` for 1-indexed APIs.
- [List/Grid changelog 1.69.0] native `pagination` prop on List/Grid; 1.71.0 fixed pagination with `filtering` true.

## useFetch specifics
- [useFetch] `useFetch<V, U, T = V>(url: RequestInfo, options?: RequestInit & { parseResponse?, mapResult?, initialData?, keepPreviousData?, execute?, onError?, onData?, onWillExecute?, failureToastOptions?, cacheWriteDebounce? })`.
- [useFetch] headers/body/method go straight in options (RequestInit). URLSearchParams in options OK since v1.16.3.
- [useFetch] Non-paginated re-runs when `url` string changes (v1.13.4) — build query into URL.
- [utils v2.3.0] paginated URL factories no longer run during render; safe to pass inline.

## useExec
- [useExec] two forms: `useExec(file, args[], opts)` (preferred; no escaping) or `useExec("cmd string", opts)` (spaces in paths must be backslash-escaped — matters for `environment.supportPath` / paths with spaces).
- [useExec] `shell: true` (/bin/sh) or shell path; needed for `&&`, `||`, pipes. Docs recommend against (slow, injection risk esp. with user input).
- [useExec] `input: string | Buffer` → stdin (v1.3.0). v2.3.0 fixed commands hanging forever waiting on stdin.
- [useExec] `timeout` default 10000 ms (SIGTERM); `timeout: 0` disables (restored v2.3.0).
- [useExec] `stripFinalNewline` default true; `cwd` default process.cwd(); `env` merges with process.env; `encoding: "buffer"` → Buffer stdout.
- [useExec] `parseOutput: ({ stdout, stderr, error, exitCode, signal, timedOut, command, options }) => T` — use to JSON.parse and to throw on nonzero exitCode.
- [useExec] GUI-launched env has minimal PATH: use absolute binaries (`/opt/homebrew/bin/brew` on Apple Silicon vs `/usr/local/bin/brew`).

## runAppleScript
- [runAppleScript] macOS only. Signatures:
  ```ts
  runAppleScript<T>(script, options?)
  runAppleScript<T>(script, args: string[], options?)  // read via `on run argv ... item 1 of argv`
  options: { humanReadableOutput?: boolean; language?: "AppleScript" | "JavaScript"; signal?: AbortSignal; timeout?: number; parseOutput?: ParseExecOutputHandler<T> }
  ```
- [runAppleScript] pass values as `args` instead of string-interpolating into the script (no quoting/escaping bugs).
- [runAppleScript] `humanReadableOutput` default true (lists flattened to "a, b"; ambiguous). Set false for recompilable unambiguous output; better: return JSON from JXA (`language: "JavaScript"`) and `parseOutput`.
- [runAppleScript] `timeout` default 10000 ms; `0` disables (fixed v1.18.1). v2.3.0: `parseOutput` was ignored before 2.3.0 (always string) — require >=2.3.0 if using it.
- [runAppleScript] returns trimmed stdout string by default; rejects on script error → catch + `showFailureToast`.
- [runPowerShellScript] Windows-only counterpart (utils v2.0.0), same options minus humanReadableOutput/language.

## showFailureToast / withCache
- [showFailureToast] `showFailureToast(error: unknown, { title?: string /*default "Something went wrong"*/, primaryAction?: Toast.ActionOptions })` — accepts unknown catch value, formats message. Use in no-view catch blocks.
- [withCache] `withCache(fn, { validate?: (data) => boolean, maxAge?: ms }) → fn & { clearCache() }` — memoizes async fn via Cache API across runs; keyed by args (args bug fixed v1.19.1). Good for no-view commands/tools where hooks can't be used.

## useForm
- [useForm] signature:
  ```ts
  const { handleSubmit, itemProps, values, setValue, setValidationError, focus, reset } = useForm<Values>({
    onSubmit(values) { ... },  // may be async; return type void | boolean
    initialValues: { title: "" },
    validation: { title: FormValidation.Required, url: (v) => (v && !/^https?:/.test(v) ? "Must be a URL" : undefined) },
  });
  <Action.SubmitForm onSubmit={handleSubmit} />
  <Form.TextField title="Title" {...itemProps.title} />
  ```
- [useForm] `onSubmit` only fires when all validations pass; validator returns string = error, undefined/null = ok.
- [useForm] `FormValidation.Required` is the ONLY shorthand enum member.
- [useForm] `itemProps.x` supplies id/value/onChange/error/onBlur — spread it, don't also set `id`/`value`.
- [useForm] `reset(values?)` resets to initialValues or given values (falsy explicit values respected since v2.3.0); `focus(id)`; `setValue(id, v)` for programmatic change (e.g. after async lookup).
- [useForm] import `FormValidation` from `@raycast/utils`, not `@raycast/api`.

## useSQL
- [useSQL] `useSQL<T>(dbPath, query, { permissionPriming?: string, execute?, onError?, onData?, onWillExecute?, failureToastOptions? })` → `{ data: T[], isLoading, error, permissionView, revalidate, mutate }`.
- [useSQL] MUST `if (permissionView) return permissionView;` before rendering — shows Full Disk Access prompt. `permissionPriming` = one-line why (e.g. "This is required to search your Apple Notes.").
- [useSQL] read-only use; DB path via `resolve(homedir(), "Library/...")`. v2.3.0: no longer throws during render if DB missing; fixed connection leaks.

## useFrecencySorting
- [useFrecencySorting] `const { data: sorted, visitItem, resetRanking } = useFrecencySorting(data, { namespace?, key?: (item) => string, sortUnvisited?: (a,b)=>number })`.
- [useFrecencySorting] default key = `item.id` — `key` REQUIRED if items have no `id`. Use `namespace` when >1 sorted list in one extension.
- [useFrecencySorting] call `visitItem(item)` from `onOpen`/`onCopy`/`onAction` of the primary actions; unvisited keep input order. Returned `data` is always an array (safe to `.map` when input undefined).

## useStreamJSON
- [useStreamJSON] `filter` and `transform` MUST be wrapped in `useCallback` — hook revalidates whenever their identity changes.
- [useStreamJSON] `dataPath: string | RegExp` to reach array nested in objects; `transform` returning array → its children are streamed/filtered.
- [useStreamJSON] use `initialData: [] as T[]` + `pagination` on List; do search filtering inside `filter` (not List filtering).

## useLocalStorage
- [useLocalStorage] `const { value, setValue, removeValue, isLoading } = useLocalStorage<T>(key, initialValue?)` — `setValue`/`removeValue` return Promises; value undefined until loaded → render `isLoading`.
- [useLocalStorage] vs useCachedState: LocalStorage is async + durable store; useCachedState is sync Cache (can be cleared by "Clear Local Storage & Cache"/cache eviction).

## createDeeplink
- [createDeeplink] same extension: `createDeeplink({ command: "cmd-name", launchType?, arguments?, fallbackText?, context? })` (example passes `context` → read via `props.launchContext`).
- [createDeeplink] other extension: add `ownerOrAuthorName`, `extensionName` (e.g. `"linear","linear"`).
- [createDeeplink] script command: `createDeeplink({ type: DeeplinkType.ScriptCommand, command: "count-chars", arguments: ["a b"] })` — args is string[]; encoding handled.
- [createDeeplink] pair with `<Action.CreateQuicklink quicklink={{ name, link: createDeeplink(...) }} />` (icon prop on CreateQuicklink since 1.80.0). Import `DeeplinkType` from `@raycast/utils`. Added utils v1.17.0.

## Icons
- [getFavicon] `getFavicon(url: string | URL, { fallback?: Image.Fallback /*default Icon.Link*/, size?: number /*default 64*/, mask?: Image.Mask })` → Image.ImageLike. Respects user favicon-provider setting since v2.1.0 (Apple provider unsupported).
- [getAvatarIcon] `getAvatarIcon(name, { background?: hex, gradient?: boolean /*default true*/ })` → initials avatar, color stable per name. Good for Contacts rows without photos.
- [getProgressIcon] `getProgressIcon(progress 0..1, color?: Color|hex /*default Color.Red*/, { background?, backgroundOpacity? /*0.1*/ })`.

## OAuth utils
- [OAuth Utils] pattern: `export default withAccessToken(provider)(Component)`; inside anything (component, helper, callback) call `const { token, type } = getAccessToken()` — sync; throws if called before withAccessToken finished. Token NOT injected into props.
- [withAccessToken] works for view AND no-view (wrap the async fn; fixed v1.12.0) AND menu-bar commands.
- [withAccessToken] `{ authorize: () => Promise<string>, personalAccessToken?: string, client?: OAuth.PKCEClient, onAuthorize?: ({ token, type: "oauth"|"personal", idToken }) => void }` — pass `personalAccessToken: prefs.token` to let a PAT preference bypass OAuth entirely (great for personal extensions).
- [OAuthService] built-ins: `OAuthService.asana|github|linear|slack({ scope })` work with Raycast-hosted OAuth apps (scope only). `google|jira|zoom({ clientId, scope })` need your own client.
- [OAuthService] `onAuthorize({ token })` on the service = init SDK client once (e.g. `new LinearClient({ accessToken: token })`).
- [OAuthService] `providerId` option namespaces token storage → multiple independent logins (e.g. two Linear workspaces); `extraParameters` merged over defaults (caller wins), e.g. `{ prompt: "consent" }`.
- [OAuthService] custom: `new OAuthService({ client: new OAuth.PKCEClient({ redirectMethod: OAuth.RedirectMethod.Web, providerName, providerIcon, providerId, description }), clientId, scope, authorizeUrl, tokenUrl, refreshTokenUrl?, bodyEncoding?: "json"|"url-encoded", tokenResponseParser?, tokenRefreshResponseParser? })`. `scope` may be string or string[].
- [OAuthService] `await service.authorize()` → access token (refreshes if needed). Refresh failure logs user out rather than throwing (v1.16.2).
- [Getting a Google client ID] Google: create OAuth client of type **iOS**, Bundle ID `com.raycast`; add yourself as test user (unpublished consent screen = test users only — fine for personal use).
- [API changelog 1.40.0] OAuth request APIs THROW from background-launched commands — check `launchType` before authorizing.

## @raycast/utils changelog (package versions)
- [utils v2.3.0] latest: `cacheWriteDebounce`; fixes: usePromise sync errors/rollbacks, useCachedPromise stale data with keepPreviousData off, useExec stdin hang + `timeout: 0`, runAppleScript parseOutput + timeout msg, useSQL missing-DB, useForm.reset falsy, OAuth refresh recovery, frecency decay.
- [utils v2.2.0–2.2.3] useSQL/executeSQL work on Windows.
- [utils v2.0.0] tree-shakeable; runPowerShellScript; optimistic mutate aborts in-flight fetch.
- [utils v1.19.0] withCache; v1.18.0 executeSQL; v1.17.0 createDeeplink; v1.16.0 failureToastOptions; v1.15.0 useLocalStorage; v1.14.0 useStreamJSON; v1.13.0 pagination; v1.11.0 OAuth utils; v1.10.0 showFailureToast; v1.9.0 useFrecencySorting; v1.8.0 runAppleScript (useExec timeout default → 10s).
- [Getting Started] `npm install --save @raycast/utils`; peer dep on `@raycast/api` — npm warns if api too old.

## @raycast/api changelog — recent/notable
- [API 2.5.0, 09-24-26] Extensions can PROVIDE AI models (`ai.modelProvider` in manifest; export `getModels` + `streamCompletion`; `AI.refreshModels()`; `AI.ask(prompt, { model: { id } })`; Pro required).
- [API 2.5.0] MCP server declaration: `ai.mcp` in package.json or `mcp` in `ai.yaml` (remote HTTP w/ OAuth, or local stdio); tools exposed alongside extension tools.
- [API 2.5.0] Agent Skills bundled: `ai.skills` in package.json / `skills` in ai.yaml + `skills/<name>/SKILL.md`; mentionable in AI Chat.
- [API 2.5.0] `AI.experimental_decide` — typed multi-question classification (yes/no probs, options, scoring). Experimental.
- [API 2.5.0] "Fork Extension" in Store search results.
- [API 2.3.0, 09-11-26] lower render memory/data; `AI.ask` respects numeric `creativity`.
- [API 2.0.0, 08-25-26] Raycast 2.0: API on new desktop app for macOS AND Windows; CLI requires Node >= 22.22.2.
- [API 2.0.0] `environment.entryPointType` ("command"|"tool"), `entryPointName`, `entryPointMode`; `commandName`/`commandMode` deprecated aliases — use to share code between commands and AI tools.
- [API 2.0.0] `help.md` next to package.json → shown beside setup form when required preferences missing (API-key instructions).
- [API 2.0.0] "Command Out of Memory" error + "Reload with Memory Reporting"; `captureMemorySnapshot(label)` from `@raycast/api` (no-op unless reporting on).
- [API 2.0.0] `OAuth.RedirectMethod.ClientIdMetadataDocument`; token scopes accept string[].
- [API 2.0.0] `Keyboard.Shortcut.Common` changed on macOS: CopyName ⌘⌥C, CopyPath ⌘⌃C, Pin ⌘., MoveUp/Down ⌘⌥↑/↓. Prefer Common shortcuts for platform-correct bindings.
- [API 1.104.13, 04-22-26] runtime Node 22.22.2.
- [API 1.104.6] Swift/Rust TS declarations generated even when native compile skipped on current platform.
- [API 1.104.2] `Keyboard.Shortcut.Common.Save`.
- [API 1.103.6] platform shortcut key is `Windows` (capital W); lowercase `windows` deprecated.
- [API 1.103.0, 09-15-25] manifest `platforms` field, default `["macOS"]`; `["macOS","Windows"]` to ship on Windows. Shortcuts with `cmd` are IGNORED on Windows unless nested per platform:
  ```js
  shortcut={{ macOS: { modifiers: ["cmd","shift"], key: "c" }, Windows: { modifiers: ["ctrl","shift"], key: "c" } }}
  ```
  Preference `default` may be `{ "macOS": "...", "Windows": "..." }`. Rust via `import { fn } from "rust:../rust"` (Windows only).
- [API 1.98.0] `Action.InstallMCPServer`; platform-specific shortcuts.
- [API 1.94.0] Node 22 + React 19; global `fetch` available (no node-fetch needed); ESLint 9 for new extensions; Tools can have preferences.
- [API 1.93.0] Tools entry point = AI Extensions (not in root search; AI calls them).
- [API 1.87.0] LLM doc dumps: `llms-full.txt`, `llms-api.txt`, `llms-utils.txt` at raw.githubusercontent.com/raycast/extensions/refs/heads/gh-pages/.
- [API 1.84.0] no-view w/ arguments clears only argument inputs after run.
- [API 1.81.0] LaTeX in Detail (`\(...\)`, `$$...$$`).
- [API 1.79.0] `useNavigation().push(view, onPop)` and `Action.Push onPop` — refresh parent when child pops (e.g. call revalidate).
- [API 1.78.0] `WindowManagement` API; `environment.ownerOrAuthorName`.
- [API 1.76.0] `@workaround/name` namespace allowed for package names.
- [API 1.72.0] Browser Extension API (tabs, tab content).
- [API 1.71.0] `captureException` for manual error reports.
- [API 1.69.0] Markdown image tint via `?raycast-tint-color=` query.
- [API 1.64.0] `Form.LinkAccessory`; `dropdown` argument type in manifest.
- [API 1.62.0] `MenuBarExtra.Item alternate` (⌥ swap, Sonoma+).
- [API 1.58.0] `Alert rememberUserChoice`; all path-taking APIs resolve `~`.
- [API 1.56.0] `Clipboard.read({ offset })` reads clipboard history (last 5); `Keyboard.Shortcut.Common`; reserved Raycast keys (⌘K, ⌘W, ⌘Esc) ignored + dev warning.
- [API 1.54.0] `showToast` while window closed (hotkey launch) → shown as HUD.
- [API 1.50.0] global `Preferences.<CommandName>` / `Arguments.<CommandName>` types from `raycast-env.d.ts`; `disabledByDefault` commands; `icon@dark.png` auto dark variant; raw colors auto-contrast-adjusted (opt-out).
- [API 1.49.0] `launchCommand` inter-extension + `fallbackText`.
- [API 1.44.0] `closeMainWindow({ popToRootType: PopToRootType.Immediate | Suspended })`; `file`/`directory` preference types; `getFrontmostApplication`; Dropdown/Submenu support `onSearchTextChange/isLoading/throttle/filtering`; Detail markdown `![](${Icon.X})` and asset filenames.
- [API 1.43.0] ActionPanel `autoFocus` action; `Form.FilePicker`; async entry points for view/menu-bar commands warn.
- [API 1.42.0] `launchCommand` (e.g. refresh menu-bar from view command); background interval min 10s.
- [API 1.41.0] List `filtering={{ keepSectionOrder: true }}`; `onSelectionChange` type is `string | null`.
- [API 1.40.0] DatePicker value type `Date | null`; warnings for `value` without `onChange`.

## Migration
- [Migration] `npx ray migrate` (or `npx @raycast/migration@latest .`) applies all codemods since your API version; review diffs after.
- [v1.50.0] `raycast-env.d.ts` generated at root: gitignore it; add to tsconfig `"include": ["src/**/*", "raycast-env.d.ts"]`; type via `getPreferenceValues<Preferences.CommandName>()` and `LaunchProps<{ arguments: Arguments.CommandName }>`.
- [v1.48.8] ESLint config reduces to `{ "root": true, "extends": ["@raycast"] }` with `@raycast/eslint-config` dev dep.
- [v1.28.0] `preferences` constant deprecated → `getPreferenceValues()`; `render()` deprecated → `export default` component; `showToast({...})` style defaults to Success.
- [v1.37.0] Suspense works; Raycast's top-level fallback auto-sets `isLoading`. Don't add `@types/react`/`@types/node` to devDeps (api depends on them).
- [v1.51.0] `environment.theme` → `environment.appearance`. [v1.59.0] Clipboard `transient` → `concealed`. [v1.42.0] Grid `enableFiltering` → `filtering`. [v1.31.0] `accessoryTitle/Icon` → `accessories=[{ text, icon }]`.

## FAQ gotchas
- [FAQ] No `react-dom`/HTML/CSS — custom reconciler renders native AppKit views.
- [FAQ] ESM packages require converting the extension to ESM: TS >= 4.7, `"type": "module"` in package.json, tsconfig `"module": "node16", "moduleResolution": "node16"`, full relative paths WITH `.js` extension even for `.ts` files, no `namespace`, `node:` prefix for builtins. (utils v2.0.1 fixed ESM types.)
- [FAQ] Script commands = any language, limited output; extensions = TypeScript, rich UI or headless.
- [API 1.26.3] default-export heuristic: some CJS packages need `import * as x from "pkg"` instead of default import.
- [API 1.38.0] Dev action "Clear Local Storage & Cache" clears both LocalStorage and Cache (wipes useCachedState/useCachedPromise data).
- [API 1.31.0] Dev action to clear local assets cache → refresh changed list icons without restart; for users, rename assets to bust cache.
- [API 1.65.0] no logs in terminal? enable dev option "Use file logging instead of OSLog".
