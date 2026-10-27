# Raycast API reference: signatures and gotchas

> Distilled from developers.raycast.com API Reference pages (API 2.5.0, @raycast/utils 2.3.0). Tags like `[Manifest]` name the source page. When a fact looks stale, re-check it live: `curl -s 'https://developers.raycast.com/readme.md?ask=<question>'`, or grep the full dump (`curl -sL https://developers.raycast.com/llms-full.txt` plus `/llms-full.txt/1`).

## Not in the API reference (do not claim these)
- [Clipboard] No `transient` copy option — only `concealed`. (Check newer @raycast/api typings before using `transient`.)
- [Environment] No `supportsDetail`. Table lists `entryPointMode` ("view"|"no-view"|"menu-bar"), `entryPointName`, `entryPointType` ("command"|"tool"); `commandMode`/`commandName` appear only in the example (older aliases).
- [Keyboard] No list of reserved shortcuts in this doc.

## Clipboard
- [Clipboard] `copy(content: string | number | Clipboard.Content, options?: { concealed?: boolean })`; concealed = kept out of Raycast Clipboard History.
- [Clipboard] `Content` = `{ text }` | `{ file: PathLike }` | `{ html, text? }` (text = plain fallback). Copying a file: `Clipboard.copy({ file: "/abs/path.pdf" })` — wrap in try/catch.
- [Clipboard] `paste(content: string | Content)` inserts into the frontmost app's current selection (no concealed option).
- [Clipboard] `read({ offset? })` → `{ text, file?, html? }`; `readText({ offset? })` → `string | undefined`. `offset` 0-5 reaches back into Clipboard History.
- [Clipboard] `Clipboard.clear()` exists.
- [Actions] `Action.CopyToClipboard` closes the main window + shows a HUD after copying; props `content, concealed, onCopy, title, icon, shortcut`.
- [Actions] `Action.Paste` pastes to the frontmost app and closes the window; `onPaste` callback.

## Cache vs LocalStorage
- [Cache] `new Cache({ capacity?, namespace? })`; default capacity **10 MB**, LRU eviction when exceeded. Data lives in files under the support dir; only a small index in memory.
- [Cache] **Synchronous**: `get(key): string|undefined`, `has(key)` (does NOT touch LRU order), `set(key, data: string)`, `remove(key): boolean`, `clear({ notifySubscribers = true })`, `isEmpty`.
- [Cache] Strings only: `JSON.stringify` / `JSON.parse` yourself.
- [Cache] Shared across all commands of the extension by default; `namespace` = subdirectory (e.g. `environment.commandName`) to isolate per command.
- [Cache] `subscribe((key|undefined, data|undefined) => void)` returns an unsubscribe fn; key `undefined` = cleared.
- [Cache] Sync reads make it the right tool for instant first render (read at module top, before React) and for menu-bar commands.
- [Storage] `LocalStorage` = Raycast's local **encrypted** DB; async: `getItem<T>(key)`, `setItem(key, value)`, `removeItem`, `allItems<T>()`, `clear()`.
- [Storage] Value type is only `string | number | boolean`. Shared by all commands of one extension; other extensions can't read it.
- [Storage] Not for large data — write files to `environment.supportPath` with Node `fs` instead.
- Rule of thumb: LocalStorage = small durable user data/settings (encrypted); Cache = disposable fetched data, sync, size-capped.

## Commands (launchCommand / metadata)
- [Command] `launchCommand({ name, type: LaunchType.UserInitiated | LaunchType.Background, arguments?, context?, fallbackText? })`. Cross-extension adds `extensionName` + `ownerOrAuthorName` and shows a permission alert.
- [Command] Throws if the command doesn't exist or is disabled. Promise resolves when launched, NOT when finished.
- [Command] `context` must be JSON-serialisable (Dates/Buffers OK); read it in the target via `LaunchProps` (`props.launchContext`).
- [Command] Use case: a view/no-view command calls `launchCommand({ name: "menubar", type: LaunchType.Background })` to refresh its menu-bar command immediately.
- [Command] `updateCommandMetadata({ subtitle: string | null })` — only `subtitle` is supported; `null` clears it. Manifest file not changed; persists while installed. Good for "Unread: 10" in root search.
- [Environment] `LaunchType.UserInitiated` | `LaunchType.Background` (interval-scheduled). Check `environment.launchType` to skip UI work in background runs.

## Environment
- [Environment] Fields: `appearance` ("dark"|"light"), `assetsPath`, `supportPath`, `extensionName`, `ownerOrAuthorName`, `isDevelopment` (dev vs Store install), `launchType`, `raycastVersion`, `textSize` ("medium"|"large"), `entryPointMode/Name/Type`.
- [Environment] `environment.canAccess(AI)` / `canAccess(BrowserExtension)` / `canAccess(WindowManagement)` → boolean. Pro-gated APIs otherwise prompt the user and THROW if declined.

## Window & feedback
- [Window & Search Bar] `closeMainWindow({ clearRootSearch?, popToRootType? })`; `PopToRootType.Default` (user pref) | `.Immediate` | `.Suspended` (don't pop; use when handing off to a system utility and expecting the user back in the view).
- [Window & Search Bar] `clearSearchBar({ forceScrollToTop? })`; `popToRoot({ clearSearchBar? })`.
- [HUD] `showHUD(title, { clearRootSearch?, popToRootType? })` — closes the main window itself (same options as closeMainWindow); message shows at bottom of screen.
- [Toast] `showToast()` falls back to a HUD when the Raycast window is closed.
- [Toast] `showToast({ style, title, message?, primaryAction?, secondaryAction? })` returns a `Toast`; mutate in place: `toast.style = Toast.Style.Success; toast.title = "Done"; toast.message = ...`; `toast.hide()`, `toast.show()`.
- [Toast] Styles: `Animated` (spinner; keep until done), `Success`, `Failure`. Pattern: create Animated → update to Success/Failure in try/catch.
- [Toast] Toast action: `{ title, onAction: (toast) => void, shortcut? }`; actions appear on hover (e.g. "Copy Error", "Undo", "Cancel").
- [Alert] `Alert.Options` has `rememberUserChoice: true` → "Do not show this message again" checkbox; answer auto-returned next time. Also `icon`, `message`, `primaryAction`, `dismissAction`. `Alert.ActionStyle.Default|Destructive|Cancel`.

## Keyboard
- [Keyboard] `Keyboard.Shortcut.Common.*` (macOS): Copy ⌘⇧C, CopyDeeplink ⌘⇧C, CopyName ⌘⌥C, CopyPath ⌘⌃C, Save ⌘S, Duplicate ⌘D, Edit ⌘E, MoveDown ⌘⌥↓, MoveUp ⌘⌥↑, New ⌘N, Open ⌘O, OpenWith ⌘⇧O, Pin ⌘., Refresh ⌘R, Remove ⌃X, RemoveAll ⌃⇧X, ToggleQuickLook ⌘Y.
- [Keyboard] Modifiers: `"cmd" | "ctrl" | "opt" | "shift" | "alt" | "windows"` ("alt" == "opt").
- [Keyboard] Cross-platform form when using cmd/ctrl/windows: `{ macOS: { modifiers: ["cmd","shift"], key: "c" }, Windows: { modifiers: ["ctrl","shift"], key: "c" } }`.
- [Keyboard] Keys: a-z, 0-9, `` . , ; = + - [ ] { } « » ( ) / \ ' ` ^ @ $ `` plus the section-sign key, `return delete deleteForward tab arrowUp/Down/Left/Right pageUp pageDown home end space escape enter backspace`.
- [Action Panel] Primary/secondary defaults: List/Grid/Detail ↵ and ⌘↵; Form ⌘↵ and ⌘⇧↵. A custom shortcut on primary/secondary works but is NOT displayed.

## Menu bar (MenuBarExtra)
- [Menu Bar] manifest `"mode": "menu-bar"`, optional `"interval": "5m"` for background refresh (user must activate it; run again to refresh).
- [Menu Bar] Not long-lived: loaded, rendered, unloaded. No `isLoading` → render + unload immediately. With `isLoading` → Raycast waits until it flips to `false`, then unloads. **Always set isLoading false at the end**, or it never unloads.
- [Menu Bar] Clicking the icon (if it has children) loads the command and keeps it in memory while the menu is open; unloads on close.
- [Menu Bar] After a Raycast restart / re-enable, the item is restored from Raycast's DB — code is NOT run.
- [Menu Bar] Return `null` to remove the item from the menu bar. macOS may hide it if the menu bar is crowded.
- [Menu Bar] `MenuBarExtra` props: `icon`, `title` (keep short), `tooltip`, `isLoading`, children.
- [Menu Bar] `MenuBarExtra.Item`: `title`*, `subtitle`, `icon`, `tooltip`, `shortcut`, `onAction(event)`, `alternate`. Title-only (or title+icon) with no onAction renders DISABLED → use as a section header.
- [Menu Bar] `alternate` item shows while holding ⌥: inherits parent shortcut + ⌥; can't have its own alternate; parent can't use ⌥ in its shortcut.
- [Menu Bar] `onAction` event `type`: `"left-click"` (also shortcut) | `"right-click"`.
- [Menu Bar] `MenuBarExtra.Section title?` auto-adds separators; `MenuBarExtra.Submenu` with no children = disabled; `MenuBarExtra.Separator`.
- [Menu Bar] Don't put identical Items at the same level — their onAction handlers misfire. Use Cache for instant first paint.
- [Menu Bar] Not available on Windows.

## OAuth (PKCE only)
- [OAuth] `const client = new OAuth.PKCEClient({ redirectMethod: OAuth.RedirectMethod.Web, providerName, providerIcon?, description?, providerId? })`.
- [OAuth] Flow: `const req = await client.authorizationRequest({ endpoint, clientId, scope, extraParameters? })` (S256) → `const { authorizationCode } = await client.authorize(req)` → POST token endpoint yourself with `client_id, code, code_verifier: req.codeVerifier, grant_type: "authorization_code", redirect_uri: req.redirectURI` → `await client.setTokens(tokenResponse)`.
- [OAuth] `getTokens()` → `TokenSet | undefined`; `tokenSet.isExpired()` needs `expiresIn` set (fires a few seconds early); refresh with `grant_type=refresh_token`, keep old refresh_token if the response omits one.
- [OAuth] Saving tokens auto-adds a **logout** preference; `removeTokens()` only for extra logout/migrations.
- [OAuth] Redirect URIs: Web `https://raycast.com/redirect?packageName=Extension` (or `/redirect/extension` + `extraParameters.redirect_uri`); App `raycast://oauth?package_name=Extension`; AppURI `com.raycast:/oauth?package_name=Extension` (single slash, Google); `ClientIdMetadataDocument` may omit clientId.
- [OAuth] Never hardcode a client secret; non-PKCE providers → Raycast PKCE proxy (oauth.raycast.com).
- [OAuth] In dev, don't save files mid-auth: hot reload reinitialises the client → state mismatch.

## Preferences
- [Preferences] `getPreferenceValues<Preferences.CommandName>()` — types auto-generated in `raycast-env.d.ts`; global `Preferences` namespace per command.
- [Preferences] Value types: textfield/password/dropdown/file/directory → string, checkbox → boolean, appPicker → `Application`.
- [Preferences] Required prefs block the command until set. Add `help.md` next to package.json (any case) → rendered beside the setup form, replaces the README link.
- [Preferences] `openExtensionPreferences()` / `openCommandPreferences()` → wire into an Action on an auth/API-key error screen.

## System utilities
- [System Utilities] `getApplications(path?)` → `Application[]` (`name, path, bundleId?, localizedName?`); match on bundleId, not path.
- [System Utilities] `getDefaultApplication(path)` rejects if none; `getFrontmostApplication()` rejects if none.
- [System Utilities] `open(target, application?)` — application = name, bundle id, absolute path, or Application: `open(url, "com.google.Chrome")`.
- [System Utilities] `showInFinder(path)`, `trash(path | path[])` (moves to Trash, not delete).
- [System Utilities] `captureException(e)` reports to the Developer Hub (Store only; useless for private dev extensions).
- [System Utilities] `captureMemorySnapshot(label)` — no-op unless "Reload with Memory Reporting" is chosen after a "Command Out of Memory" error; shows Memory Diagnostics.
- [Environment] `getSelectedText()` rejects if nothing selected; `getSelectedFinderItems()` → `{ path }[]`, rejects if Finder isn't frontmost. Wrap both in try/catch → failure toast.

## Actions
- [Actions] Built-ins: `CopyToClipboard`, `Paste`, `Open` (target, title*, application?), `OpenInBrowser` (url), `OpenWith` (path; submenu of capable apps), `Push` (target, onPush, onPop), `ShowInFinder` (path), `SubmitForm`, `Trash` (paths, onTrash), `CreateSnippet` (`snippet: { text, keyword?, name? }`), `CreateQuicklink` (`quicklink: { link, name?, application?, icon? }`, link may hold `{Query}`), `ToggleQuickLook` (needs item `quickLook: { path, name? }`), `PickDate`.
- [Actions] Open/OpenInBrowser/OpenWith/Paste/ShowInFinder all close the main window.
- [Actions] `Action` props: `title, icon, onAction, shortcut, style (Action.Style.Regular|Destructive), autoFocus`.
- [Actions] `Action.PickDate({ title, onChange, type?: Action.PickDate.Type.Date|DateTime (default DateTime), min?, max? })`; `Action.PickDate.isFullDay(date)`.
- [Actions] `SubmitForm.onSubmit(values) => boolean | void | Promise<...>` (examples `return false` on invalid input).
- [Action Panel] `ActionPanel.Submenu`: `title, icon, shortcut, autoFocus, filtering, isLoading, onSearchTextChange, throttle, onOpen` (lazy-load children in onOpen).

## Form
- [Form] Controlled (`value`+`onChange`) vs uncontrolled (`defaultValue`). `defaultValue` applies once per lifecycle; `value` wins over it; `storeValue` restores last SUBMITTED value next open.
- [Form] Validation: set `error` in `onBlur`, clear it in `onChange`. Any `error` present → `onSubmit` is NOT called. Recommended: `useForm` + `FormValidation.Required` from `@raycast/utils` (`itemProps.x` spread).
- [Form] Drafts: `<Form enableDrafts>` + `LaunchProps<{ draftValues: T }>` → seed `defaultValue={draftValues?.x}`. Not for forms pushed via navigation; PasswordField not saved; dropped on submit; `popToRoot()` skips draft saving.
- [Form] Items: TextField, PasswordField, TextArea (`enableMarkdown` → ⌘B/⌘I shortcuts), Checkbox (`label`* right side, `title` left), DatePicker, Dropdown (+Item/Section, `filtering`, `throttle`, `onSearchTextChange`, `isLoading`, Item `keywords`), TagPicker (+Item; value `string[]`), FilePicker, Separator, Description (`text`*, `title`), LinkAccessory.
- [Form] Common props: `id`*, `title`, `info` (hover ⓘ), `error`, `autoFocus`, `storeValue`, `onFocus/onBlur(event: Form.Event<T>)` (`event.target.{id,value}`, `type` "focus"|"blur").
- [Form] DatePicker: `type: Form.DatePicker.Type.Date | DateTime` (default DateTime), `min`/`max`; value `Date | null`; `Form.DatePicker.isFullDay(date)`.
- [Form] FilePicker: `allowMultipleSelection`, `canChooseDirectories`, `canChooseFiles`, `showHiddenFiles`; value `string[]`; re-check `fs.existsSync` on submit.
- [Form] `<Form searchBarAccessory={<Form.LinkAccessory target="https://…" text="Docs" />}>` — link top-right.
- [Form] Imperative: `const ref = useRef<Form.TextField>(null)`; `ref.current?.focus()` / `.reset()` (resets to defaultValue). Every item type exposes both.
- [Form] Form props: `actions, enableDrafts, isLoading, navigationTitle, searchBarAccessory`.

## List
- [List] Built-in fuzzy filter on `title` + `keywords`. Setting `onSearchTextChange` IMPLICITLY sets `filtering={false}` — pass `filtering` explicitly to keep native filtering.
- [List] `filtering={{ keepSectionOrder: true }}` keeps section order under native filtering.
- [List] `throttle` → debounce `onSearchTextChange` for async/network search.
- [List] `searchText` (controlled search bar), `searchBarPlaceholder`, `selectedItemId`, `onSelectionChange(id | null)`, `navigationTitle`, `actions` (only shown when no children).
- [List] `searchBarAccessory={<List.Dropdown tooltip="…" storeValue onChange={…}>…</List.Dropdown>}`; opens with ⌘P; `tooltip` required; supports Section/Item(`keywords`), `filtering`, `throttle`.
- [List] `pagination={{ onLoadMore, hasMore, pageSize }}` (api ≥1.69); usePromise/useCachedPromise return a ready `pagination`. Raycast may stop calling onLoadMore on memory pressure. Needs > one screen of items (use ~20+ per page) or onLoadMore never fires.
- [List] `List.EmptyView { title, description, icon, actions }` overrides default empty state; never shown while `isLoading` AND search empty.
- [List] `List.Item`: `title` / `subtitle` accept `{ value, tooltip }`; `id`, `keywords`, `icon`, `accessories`, `detail`, `quickLook`, `actions`.
- [List] Accessory: `{ text: string | { value, color } , icon, tooltip }`, `{ date: Date }` (relative "now"/"1d"), `{ tag: string | Date | { value, color } }` (colored pill). Don't combine with `isShowingDetail`.
- [List] `List.Item.Detail { markdown, metadata, isLoading }`; `List.Item.Detail.Metadata.{Label(title, text: string|{value,color}, icon), Link(title,target,text), TagList(title) > TagList.Item(text|icon, color, onAction), Separator}`.
- [List] `List.Section { title, subtitle }`.
- [Detail] Markdown image params: `?raycast-width=250&raycast-height=250`, `?raycast-tintColor=blue`. LaTeX: `\(..\)`, `\[..\]`, `$$..$$`.

## Grid
- [Grid] Same API as List; `Grid.Item.content` (instead of icon) = ImageLike | `{ color }` | `{ value, tooltip }`; `title`, `subtitle`, `accessory` (single), `keywords`, `quickLook`.
- [Grid] `columns` 1-8; `aspectRatio` "1"|"3/2"|"2/3"|"4/3"|"3/4"|"16/9"|"9/16"; `fit` Grid.Fit.Contain (default) | Fill; `inset` Grid.Inset.Small|Medium|Large (default none). Grid.Section can override all four.
- [Grid] No `isShowingDetail`; `Grid.ItemSize` deprecated → use `columns`.

## Colors & images
- [Colors] `Color.Blue|Green|Magenta|Orange|Purple|Red|Yellow|PrimaryText|SecondaryText` adapt to theme. Raw strings (hex, rgb, hsla, keywords) get contrast-adjusted; for exact colors use `{ light, dark, adjustContrast: false }`.
- [Icons & Images] `ImageLike` = URL | asset filename | `Icon.X` | `{ fileIcon: path }` (Finder icon) | `{ source, mask?, tintColor?, fallback? }`. A single emoji string works as source.
- [Icons & Images] `Image.Mask.Circle | RoundedRectangle`; `tintColor` tints all non-transparent pixels; `fallback` inherits mask/tint.
- [Icons & Images] Theme-aware: `icon.png` + `icon@dark.png` in assets (implicit), or `source: { light, dark }`.

## Navigation
- [Navigation] `const { push, pop } = useNavigation(); push(<View />, onPop?)`; ESC pops automatically. Prefer `Action.Push` (has `onPush`/`onPop`).

## AI
- [AI] `AI.ask(prompt, { creativity?, model?, signal? }): Promise<string> & EventEmitter`; stream via `const a = AI.ask(p); a.on("data", chunk => …); await a;`.
- [AI] `creativity`: "none"|"low"|"medium"|"high"|"maximum"|0-2 number (clamped). `model`: `AI.Model["Anthropic_Claude_Sonnet_5"]`-style keys or `{ id }` for extension-provided models; unavailable model → similar fallback. [API 2.7.0, npm, no docs changelog entry] adds `AI.Model["OpenAI_GPT-6.1_Sol"]` and deprecates `OpenAI_GPT-5.6_Sol`; deprecated keys still compile, so read the current list from `node_modules/@raycast/api/types/index.d.ts` (`enum Model`) before naming one.
- [AI] Rate limit **10/min, 100/hour** per extension. Non-Pro users get prompted; declining throws → catch + failure toast; pre-check `environment.canAccess(AI)`.
- [AI] In React use `useAI` from @raycast/utils instead.
- [AI] `AI.experimental_decide({ state, questions: { k: { type: "noul"|"choice"|"score", instructions, criteria? } } }, { signal? })` → typed probability/choice/score answers, no streaming. Experimental.

## Tool (AI extensions)
- [Tool] Tools are entry points only the AI calls. `export const confirmation: Tool.Confirmation<Input> = async (input) => ({ message?, info?: {name, value?}[], style?: Action.Style, image? })`; return `undefined` to skip confirmation; cancel = tool not run.

## Window Management (Pro, macOS only)
- [Window Management] `getActiveWindow()` (rejects if none), `getWindowsOnActiveDesktop()`, `getDesktops()` (`{ id, active, screenId, size, type: User|FullScreen }`).
- [Window Management] `setWindowBounds({ id, bounds: { position?: {x?,y?}, size?: {width?,height?} }, desktopId? })` or `{ id, bounds: "fullscreen" }`; rejects if impossible. Check `window.positionable` / `resizable` / `fullScreenSettable` first. Window has `application?.bundleId`.

## Browser Extension (macOS only)
- [Browser Extension] `BrowserExtension.getTabs()` → `{ id, url, active, title?, favicon? }[]` (multiple `active` if multiple windows).
- [Browser Extension] `getContent({ format?: "html"|"text"|"markdown", cssSelector?, tabId? })` — default = active tab of focused window; markdown = reader-mode heuristic; selector returns first match or "". Needs Raycast browser extension (prompts/throws); `canAccess(BrowserExtension)`.
