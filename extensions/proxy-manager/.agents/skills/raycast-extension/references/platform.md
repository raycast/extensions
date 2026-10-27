# Raycast extension platform: manifest, lifecycle, CLI, debugging, AI tools

> Distilled from developers.raycast.com Basics, AI, and Information pages (API 2.5.0, @raycast/utils 2.3.0). Tags like `[Manifest]` name the source page. When a fact looks stale, re-check it live: `curl -s 'https://developers.raycast.com/readme.md?ask=<question>'`, or grep the full dump (`curl -sL https://developers.raycast.com/llms-full.txt` plus `/llms-full.txt/1`).

## Requirements / setup
- [Getting Started] Raycast >= 1.26.0, Node >= 22.14, npm >= 7. (The API 2.0.0 changelog says the CLI now needs Node >= 22.22.2 — go with the higher one.) Must be signed in to Raycast for Create/Import/Manage Extensions commands.
- [Create Your First Extension] `npm install && npm run dev`; dev extension appears at TOP of root search. Stop with Ctrl-C; commands stay installed (searchable by extension or command name).
- [Teams Getting Started] Dev commands show in a "Development" section of root search.
- [Contribute] Store extensions can be forked via the `Fork Extension` action on any command in root search (auto-adds you to `contributors`).

## Manifest (package.json) — extension level
- [Manifest] Required: `name` (URL-safe, used in store link + deeplink), `title`, `description`, `icon`, `author` (store handle), `platforms`, `categories`. `commands` and `tools` optional.
- [Manifest] `platforms`: array of `"macOS"` and/or `"Windows"`. Restrict to `["macOS"]` when using AppleScript/macOS-only APIs.
- [Manifest] `icon`: file in `assets/`, 512x512 PNG. Light/dark pair via `@dark` suffix: `icon.png` + `icon@dark.png` (applies to extension, command, tool, skill icons).
- [Manifest] `keywords` (extension level) = Store search only; command-level `keywords` = root-search aliases inside Raycast.
- [Manifest] `external`: array of packages/files excluded from bundling; import kept, resolved at runtime (useful for native modules that break esbuild).
- [Manifest] `owner` = org handle -> extension becomes private (unless `access: "public"`). `access`: `"public"|"private"`. `contributors`, `pastContributors` = arrays of handles.
- [Versioning] Do NOT put a `version` field in the manifest; there is only an implicit "latest". To use newer API, bump `@raycast/api` dep.
- [Versioning] Raycast checks API version vs app version at install; mismatch prompts user to update Raycast.

## Manifest — command properties
- [Manifest] Required: `name` (maps to `src/<name>.{ts,tsx,js,jsx}`), `title`, `description`, `mode`.
- [Manifest] `mode`: `"view"` (renders React root), `"no-view"` (async fn, no UI pushed), `"menu-bar"` (returns MenuBarExtra).
- [Manifest] `subtitle`: shown in root search, indexed for search (e.g. "xcode recent projects" finds "Search Recent Projects" w/ subtitle Xcode). Changeable at runtime via `updateCommandMetadata({ subtitle })`.
- [Manifest] `icon` optional per command; falls back to extension icon.
- [Manifest] `interval`: only for `no-view`/`menu-bar`; units s/m/h/d, e.g. `"90s"`, `"10m"`, `"12h"`, `"1d"`. The docs disagree on the minimum (Manifest page: 1m; Background Refresh page: 10s). Use 1m or more.
- [Manifest] `arguments`: array (max 3), see Arguments below.
- [Manifest] `preferences` at command level: inherits extension prefs; same `name` overrides the extension-level one.
- [Manifest] `disabledByDefault: true`: command ships disabled; only evaluated on fresh install or when a NEW command appears (flipping it later does nothing for existing installs).

## Manifest — preferences
- [Manifest] Required keys: `name`, `title`, `description` (tooltip), `type`, `required`.
- [Manifest] `type`: `"textfield" | "password" | "checkbox" | "dropdown" | "appPicker" | "file" | "directory"`.
- [Manifest] `checkbox` needs `label` (text beside box). Group checkboxes into one section: set `title` on the first only, leave others' `title` empty.
- [Manifest] `dropdown` needs `data: [{"title":"Item 1","value":"1"}]`; `default` = a `value` from data.
- [Manifest] `default` types: textfield string, checkbox boolean, dropdown value, appPicker = app name / bundle ID / path. Per-platform default: `{ "macOS": ..., "Windows": ... }`.
- [Manifest] `placeholder` optional.
- [Prepare for Store] `required: true` -> Raycast blocks the command with a setup form until filled.
- [File Structure / Prepare] `help.md` next to package.json: Markdown shown BESIDE the required-preferences form (replaces the "About This Extension" link). README.md at root -> "About This Extension" button on onboarding screen.
- [Prepare] Don't build a separate "configure" command; use preferences.

## Arguments
- [Arguments] Max 3 per command. Order in manifest = order of fields in root search; put required before optional.
- [Manifest] Keys: `name`*, `type`* (`"text" | "password" | "dropdown"`), `placeholder`* (REQUIRED for args), `required` (default false). `dropdown` needs `data: [{title,value}]`.
- [Arguments] All values arrive as `string`. Access via `props.arguments`.
- [Arguments] Auto-generated global namespace `Arguments.<PascalCaseCommandName>`:
  ```ts
  export default function Command(props: LaunchProps<{ arguments: Arguments.ShowTodos }>) { const { title } = props.arguments; }
  ```
- [Arguments] `password` args render as asterisks.

## Lifecycle / LaunchProps
- [Lifecycle] Default export is called on launch. View command returns JSX; no-view exports `async function` and awaits APIs.
- [Lifecycle] Launch sources: root search, alias, `launchCommand` from another command, background interval, Form draft, fallback command, deeplink.
- [Lifecycle] `LaunchProps` fields: `arguments`*, `launchType`* (`LaunchType.UserInitiated | LaunchType.Background`), `draftValues` (Form.Values when opened from a saved draft), `fallbackText` (root search text when run as fallback command), `launchContext` (object passed as `context` to `launchCommand`).
- [Lifecycle] Fallback commands: user registers command as fallback; read `props.fallbackText` to prefill.
- [Lifecycle] On unload (pop to root for view; promise resolved for no-view) the whole command is freed from memory. Commands have memory limits; exceeding = terminated with error.
- [Spotify example] no-view: call `await closeMainWindow()` BEFORE slow work (e.g. AppleScript) so it feels instant.

## Background refresh
- [Background Refresh] Only `no-view` and `menu-bar` can have `interval`.
- [Background Refresh] Scheduling is approximate (macOS energy scheduling, varies on battery). Commands killed after a timeout scaled to interval (prevents overlap).
- [Background Refresh] no-view runs until main promise resolves; menu-bar runs until `isLoading` becomes `false` — set it false ASAP.
- [Background Refresh] Branch on `environment.launchType === LaunchType.Background`.
- [Background Refresh] Typical use: `updateCommandMetadata({ subtitle: \`Unread: ${n}\` })` to show live info in root search.
- [Background Refresh] Test: root-search dev actions "Run in Background" (runs now with launchType Background) and "Show Error". Built-in "Extension Diagnostics" command lists background commands + last run.
- [Background Refresh] Errors in background runs show a warning icon on the command in root search; subtitle tooltip shows last run time.
- [Background Refresh] Raycast auto-adds a command preference to enable/disable background refresh. Store installs start DISABLED until first manual open or toggled on.
- [Background Refresh] Shared state across commands: code defensively (partial/missing state, races).

## Deeplinks
- [Deeplinks] `raycast://extensions/<author-or-owner>/<extension-name>/<command-name>` — author = manifest `author` (or `owner`), ext = manifest `name`, cmd = command `name`. Built-ins: `raycast://extensions/raycast/<slug>/<slug>` (e.g. `calendar/my-schedule`).
- [Deeplinks] Query params: `launchType=userInitiated|background` (background = don't bring Raycast forward), `arguments=<URL-encoded JSON>`, `context=<URL-encoded JSON>` (-> `props.launchContext`; param name is `context`, not `launchContext`), `fallbackText=<string>` (prefills search bar / first text input).
  ```
  (illustrative) raycast://extensions/<author>/<ext>/<cmd>?arguments=%7B%22title%22%3A%22Hi%22%7D
  ```
- [Deeplinks] Every root command has a `Copy Deeplink` action — use it instead of hand-building.
- [Deeplinks] Launching a command by deeplink makes Raycast ask the user to confirm first.

## Debugging
- [Debug] `console.log/debug/error` output goes to the terminal running `npm run dev` (not Raycast). Console logging is auto-disabled for store builds.
- [Debug] Unhandled exceptions/rejections -> error overlay with stack trace + "jump to source" action in dev; prod shows message only. Show a Toast for expected errors.
- [Debug] VS Code extension `tonka3000.raycast`: "Raycast: Start Development Mode", "Raycast: Attach Debugger" -> real breakpoints.
- [Debug] React DevTools: `npm install --save-dev react-devtools@6.1.1`, rerun `npm run dev`, open command, press `Cmd+Opt+D`. Or global `npm i -g react-devtools@6.1.1` and run `react-devtools` (auto-connects). Edit props live.
- [Debug] Dev extensions run with `NODE_ENV=development` (extra warnings, e.g. missing `key`; slower). Force prod: Raycast Settings > Advanced > "Use Node production environment".
- [Debug] `process.env.NODE_ENV === "development"` = Node env; `environment.isDevelopment` = running the local dev copy vs store copy (use this one to gate dev-only behavior).
- [CLI] Auto-reload on save is toggleable: Raycast Settings > Extensions > Developer > "Auto-reload on save".
- [CLI] During dev, the command icon bottom-left shows rebuilding/failed state; build errors offer open-in-editor/copy-diagnostic, and the LAST SUCCESSFUL build keeps running (a broken save doesn't break the command — check the icon if changes "don't apply").
- [Debug] Extension Issue Dashboard (raycast.com/extension-issues) only for public extensions.

## CLI (`npx ray ...`, ships in @raycast/api)
- [CLI] `ray help` lists commands.
- [CLI] `ray develop` — dev mode: top of root search, hot reload, logs in terminal, detailed overlays, imports extension if not already imported.
- [CLI] `ray build` — optimized prod build (what CI uses). `ray build -e dist` validates build to `dist/` (template `build` script). Does stricter type checking than develop.
- [CLI] `ray bundle` — creates `<extension-name>.rayext` zip (package.json + built files at root); `-o/--output <path>`. Handy for sharing/archiving a personal extension without the store.
- [CLI] `ray lint` — ESLint over `src/`. (VS Code ext also exposes a `fix-lint` op.)
- [CLI] `ray migrate` — migrate to latest `@raycast/api`.
- [CLI] `ray publish` — verify+build+publish; private store if `owner` set without public `access`. Missing script fix: `"publish": "npx @raycast/api@latest publish"`.
- [Publish] `npx @raycast/api@latest pull-contributions` needed before publish if others edited on GitHub.
- [Publish Private] `npx ray login` / `npx ray logout`.
- [Evals] `npx ray evals` (builds, runs remotely, prints pass/fail); `npx ray evals --only 0,2` (zero-based indexes). Needs `ray login`.
- [Templates] Boilerplates: `npm init raycast-extension -t <template-name>`.
- [Arguments example] Typical scripts: `"dev": "ray develop", "build": "ray build -e dist", "lint": "ray lint"`.

## ESLint
- [ESLint] Flat config `eslint.config.js`:
  ```js
  const { defineConfig } = require("eslint/config");
  const raycastConfig = require("@raycast/eslint-config");
  module.exports = defineConfig([...raycastConfig, { rules: { "@raycast/prefer-placeholders": "warn" } }]);
  ```
- [ESLint] Includes `@raycast/prefer-title-case` rule for Action titles. Extensions older than API 1.48.8 need migration to get config.

## File structure
- [File Structure] `src/<command>.tsx`; tools in `src/tools/<tool>.ts`; `assets/` (bundled, runtime-accessible, usable as manifest icons); `metadata/` (Store screenshots PNG, not bundled); `media/` (README images, not bundled); `help.md`; `README.md`; `CHANGELOG.md`; `ai.yaml|ai.yml|ai.json|ai.json5`; `skills/<name>/SKILL.md`.
- [File Structure] Use `.tsx`/`.jsx` for commands with UI.
- [Prepare] Remove unused assets/icons.

## AI extensions (tools)
- [AI Getting Started] AI APIs (`AI.ask`) and AI Extensions both need Raycast Pro.
- [Create AI Extension] Add tool: Manage Extensions -> your extension -> "Add New Tool" (`Opt+Cmd+T`), or add to `tools` array manually. Manage Extensions also has "Add New Command" (updates manifest + scaffolds file from template).
- [Manifest] Tool props: `name`* (-> `src/tools/<name>.ts`), `title`*, `description`* (fed to the AI), `icon`.
- [Create AI Extension] With tools, root search shows "Ask <Extension>"; in AI Chat/Quick AI mention with `@<extension-name>`.
- [Core Concepts] Tool = default-exported function taking ONE object input; return value goes back to AI.
- [Core Concepts] JSDoc `/** ... */` on the function and on each Input field = descriptions the AI sees. Document formats (ISO 8601 dates) and where IDs come from (e.g. "id must come from get-todos").
- [Core Concepts] Human-in-the-loop:
  ```ts
  export const confirmation: Tool.Confirmation<Input> = async (input) => ({ message: `Delete ${input.name}?` });
  ```
  Runs before tool; cancel = tool not executed. [AI Best Practices] Can be used conditionally based on input (e.g. confirm only when a move would overwrite).
- [Core Concepts] `ai.instructions`: string added as system message whenever extension is mentioned. Don't write "You are a ... assistant" (multiple extensions share a chat); describe domain relationships/formats.
- [Core Concepts / File Structure] Prefer `ai.yaml` next to package.json (`instructions: |`, `evals:`, `skills:`). AI file props override package.json `ai`; file's `skills` array REPLACES manifest's.
- [Manifest] `ai` keys: `skills`, `mcp`, `modelProvider`, `instructions`, `evals`.
- [Manifest] `ai.mcp`: one MCP server. HTTP: `url`, `type` (`http|sse`), `headers`, optional `oauth: {type:"dynamic"}` or `{type:"static", clientId, clientSecret?, scopes?}`. Stdio: `command`, `type:"stdio"`, `args`, `env`. Adds "Ask Extension" even with no tools/commands; declared tool wins on name clash.
- [File Structure] Bundled Agent Skills: `skills/<name>/SKILL.md` with frontmatter `name` (lowercase-hyphenated, = dir name) + non-empty `description`; must be declared in `ai.skills: [{ name, title, icon? }]`. Mentioning a skill loads it + makes its extension's tools available; mentioning the extension does not load skills.

## Evals
- [Evals] Location: `ai.evals` in package.json or `evals` in ai.yaml. Also used as suggested prompts unless `"usedAsExample": false`.
- [Evals] Fields: `input` (must include `@<extension name>`), `mocks` (`{ "<tool-name>": <return value> }`, tool name w/o prefix; tools are NOT executed), `expected` (array, all must pass), `usedAsExample`.
- [Evals] Expectations: `{"includes": "added"}` (case-insensitive substring), `{"matches": "<regex>"}`, `{"meetsCriteria": "<plain text, AI-judged>"}`, `{"callsTool": "get-todos"}`, long form `{"callsTool": {"name": "...", "arguments": {...}}}`, `{"not": {...}}`.
- [Evals] Argument matchers: primitives = `eq`; array = `and`; `{"eq": [..]}` for literal arrays; `includes`, `matches`, `or`, `not`; dot notation `"user.name": "thomas"`.
- [Evals] Capture: run `ray develop`, single-prompt conversation mentioning extension, Actions -> "Copy Eval" (JSON with prompt+mocks+callsTool). Only single-prompt convos; first successful result per tool kept. Scrub personal data.

## Provide AI models (extension as model provider)
- [Provide AI Models] `"ai": { "modelProvider": "models" }` -> `src/models.ts` exporting named `getModels` (AI.GetModels -> AI.RegisteredModel[]) and `streamCompletion` (AI.StreamCompletion). Pro required; user must "Allow AI Models".
- [Provide AI Models] RegisteredModel: `id`*, `title`*, `icon`, `description`, `isLocal`, `capabilities` {systemMessage, temperature, streaming, tools: {supported}, reasoningEffort {supported, options, default}, vision {mediaTypes: png/jpeg/webp/gif}}, `contextWindow`, `sizeInBytes`.
- [Provide AI Models] streamCompletion may return AI SDK `streamText` result, ReadableStream, or async iterable of strings/stream parts. Messages are Vercel AI SDK ModelMessage; wrap tool schemas with `jsonSchema()`. Context in `request.providerOptions.raycast` {locale, currentDate, reasoningEffort} — must map manually.
- [Provide AI Models] `AI.refreshModels()` (commands/tools only, not in provider file) re-runs getModels. `AI.ask(prompt, { model: { id: "<own-id>" } })` targets own models (other extensions can't).

## Security / runtime
- [Security] All extensions run in ONE Raycast-managed child Node process (Node downloaded + verified by Raycast; not your system Node); each extension in its own v8 isolate/worker with limited heap.
- [Security] Extensions talk to Raycast only through a defined RPC API set.
- [Security] NOT sandboxed for file I/O, network, child processes. TCC permissions (Documents, screen recording, Automation) are granted to Raycast (parent), not the extension.
- [Security] Password preferences + LocalStorage are stored in Raycast's local encrypted DB, readable only by that extension.
- [Prepare] Keychain access is rejected in store review (fine for personal use, but prefer password prefs).
- [Prepare] No external analytics allowed; US English only, no custom localization (use preferences for locale-dependent units).

## UX rules worth following even for personal extensions
- [Prepare] Titles in Apple Style Guide Title Case (extension, command, and Action titles: `Open in Browser`, `Copy to Clipboard`). Lowercase OK for canonical names (iOS, npm).
- [Prepare] Command title `<Verb> <Noun>` (`Search Recent Projects`, `Create Task`), no articles, not just a service name. Extension title: nouns (`Emoji Search`). Subtitle = service/app name, not a description; omit if redundant.
- [Prepare] Action icons: all or none within a panel. Submenu actions end with `…` and children don't repeat parent name (`Set Priority…` -> Low/Medium/High).
- [Prepare] Use Navigation API (`Action.Push`/`useNavigation`), never swap view content to fake navigation.
- [Prepare] Avoid flickering "No results": don't render empty list before data; use `isLoading` (all top-level views accept it) and `List.EmptyView`/`Grid.EmptyView` for true empty states.
- [Prepare] Don't set `navigationTitle` on root command (auto = command name); only on pushed screens, keep short, don't update repeatedly.
- [Prepare] Store guideline says add placeholders to text fields/search bar.
- [Best Practices] Forms: validate in `onBlur`, clear `error` in `onChange`; `useForm` + `FormValidation.Required` from `@raycast/utils` does this. `Action.SubmitForm` `onSubmit` never fires while any field has `error`.
- [Doppler example] `storeValue` on Form items (e.g. `Form.Dropdown`) remembers last value across launches.
- [Best Practices] On network failure, fall back to cached data + Toast rather than error screen. Gate optional features on runtime deps (installed app/CLI) and show a helpful message when missing.
- [Todo example] Keyboard shortcut syntax: `shortcut={{ modifiers: ["cmd"], key: "n" }}`; common presets `Keyboard.Shortcut.Common.Copy`.
- [Prepare] Binary deps: don't bundle opaque binaries in public store; download from vendor's server + hash check. (Personal: fine in assets/.)

## Store-prep extras (optional for personal)
- [Prepare] Store needs `license: "MIT"`, `package-lock.json` (npm, not yarn/pnpm), >=1 category (Title Case, case-sensitive): Applications, Communication, Data, Documentation, Design Tools, Developer Tools, Finance, Fun, Media, News, Productivity, Security, System, Web, Other.
- [Prepare] Icon generator: https://icon.ray.so ; default Raycast icon = rejection; icon must work in light+dark.
- [Prepare] Screenshots: Raycast Settings > Advanced > Window Capture hotkey (e.g. Cmd+Shift+Opt+M); open command in dev mode (capture hides dev chrome); tick "Save to Metadata" -> `metadata/`. 2000x1250 PNG, 16:10, max 6, recommend >=3, same background, no sensitive data.
- [Prepare] CHANGELOG.md: `## [Title] - {PR_MERGE_DATE}` (or YYYY-MM-DD), newest first; shown as Version History.
- [Publish] Copy store link: Manage Extensions -> `Cmd+Opt+.`. Org handle: Manage Organization -> Copy Organization Handle `Cmd+Shift+.`.
- [Review PR] Sparse checkout of a single extension from raycast/extensions: `git clone -n --depth=1 --filter=tree:0 -b <branch> <fork>`; `git sparse-checkout set --no-cone "extensions/<name>"`; `git checkout`.

## Templates available in Create Extension
- [Templates] Commands: Show Detail, Submit Form (all form elements), Show Grid, Show List and Detail, Menu Bar Extra, Run Script (no-view + HUD), Show List, Show Typeahead Results (dynamic search), AI (AI output in Detail). Tool template: tool with confirmation.
