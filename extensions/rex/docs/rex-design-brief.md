# Rex design brief for the Raycast extension

Source app: `/Applications/Rex Beta.app` (Rex Beta 0.1.0 build 1101, bundle id `com.superlogical.rex`, release channel `preview`, source commit `9568569c…`). Everything below was read from the bundle, the user's preferences, and the Rex CLI help text; nothing in the bundle or the running app was modified. Items marked **[inferred]** are my reading of the evidence, not something the binary states outright.

Scratchpad root for all files mentioned: `<scratchpad>/`

---

## 1. Prior sessions

Searched with `agent-history search` for "Rex Beta.app", "Superlogical", "Assets.car rex", "reverse engineer rex", "rex icon", "rex themes", "Rex Server.app", "rex design", "SF Symbols rex", "SuperBlockIcons", "SuperDesignTokens"; also `ls -d ~/w/*rex*` (only `~/w/rex-raycast` exists; no notes/asset directory).

| Session | What it was | Design-relevant conclusions |
| --- | --- | --- |
| `codex:01a133fd-c82e-7f61-9bfa-4bfea327966f` — "use REA (see github) to understand what Rex Beta.app is built with", 2026-10-13 08:40–09:06, cwd `/Users/michal`. File: `/Users/michal/.codex/sessions/2026/10/13/rollout-2026-10-13T08-40-32-01a133fd-c82e-7f61-9bfa-4bfea327966f.jsonl`. Open with `agent-history show codex:01a133fd-c82e-7f61-9bfa-4bfea327966f` | The reverse-engineering session. It used REA plus three subagents and wrote 78 evidence files to **`/Users/michal/tmp/rex-beta-analysis-20261013/`** (`block-plugin-evidence.md`, `client-protocol-evidence.md`, `server-api-evidence-report.md`, `official-docs.md`, `official-program-status.md`, `official-server-api.md`, nm/strings/demangle dumps of RexAPI, RexSync, RexTerminal, rex-server). | Stack: Swift + SwiftUI/AppKit frontend, Metal renderer, Zig/Ghostty terminal emulation, Go 1.27 server, Lua 5.1 (gopher-lua) scripting. Only one block renderer exists: creator `com.superlogical.terminal`, flavor `com.superlogical.terminal.shell`. Control channel is a JSON WebSocket. **No icon, color, font or SF Symbol analysis was done.** The copy of the Program Status Protocol doc (`official-program-status.md`) is the authoritative source for status states and kinds used below. |
| `codex:01a133e1-8c6a-7e62-a964-661eac79d85b` — "look into docs of rex … chord keyboard shortcuts", 2026-10-13 08:09–09:11 | Docs reading + wrote `~/.config/rex/init.lua` tmux-style bindings. | From the docs: Rex shows automatic status symbols on tabs; a remote host can be given an icon name (`/rex/docs/reference/lua#hosts-and-other-servers`); no documented way to colour tabs or set custom tab icons; the app exposes "Rename Tab" and "Change Theme" actions. |
| `claude:a1852ee8-0c48-4f0f-bda5-c7ff53e42657` — "Rex AI docs skill", 2026-10-12 21:24 | Built the `m-rex` skill (`~/.agents/skills/m-rex`). | Only listed the bundle's Resources directory; no extraction. |

Net: a prior reverse-engineering session exists but it covered architecture/protocol, not design. Part 2 below is from scratch.

---

## 2. App icon

**Produced:** `assets/rex-app-icon-512.png` (512×512, RGBA). Rendered with `NSWorkspace.shared.icon(forFile:)` via `scripts/extract_icons.swift`, which composites the macOS 26 layered icon exactly as Finder/Dock does. Also produced: `assets/catalog/rex-app-icon-1024.png`, `assets/rex-app-icon-raw.png` (256 px, straight `sips` conversion of the `.icns`, which only contains 16/32/128/256 px reps), and the catalog previews `assets/catalog/main__AppIconBetaLightPreview.png`, `…DarkPreview.png`, `…MonoPreview.png` (256 px), `main__PlainAppIconLightBeta.png` / `main__PlainAppIconDarkBeta.png` (1024 px), `main__Rexie.png` (256 px standalone mascot). Contact sheet: `assets/sheet-app-icons.png`.

**Source in bundle:** `Contents/Resources/App Icon Beta.icns` and `Contents/Resources/Assets.car` entry `App Icon Beta` (an Icon Composer layered icon with IconGroup layers `Rexie`, `Rexie 2`, `Group`, `Group 2`; vector sublayers `App Icon Beta_Assets/{BETA, Eye, Mouth Neue, Pill, Rexie Neue Color}`; a 1024 px `Gradient` image; named gradients `Gradient-3…9`, `system-light`, `system-dark`). The app also lets the user pick `Workspace.appIcon` = `default | light | dark` (the "Plain" variants).

**Style:**
- Shape: standard macOS squircle, no border, soft drop shadow on the glyph layers (layered/"glass" depth).
- Background: a diagonal multi-stop gradient (sampled from the 1024 px `Gradient` asset): top-left magenta-lavender `#d768e1`, top-centre orange `#ff671b`, top-right yellow `#ffdc01`, left lavender `#c570ff`, centre coral-pink `#f3658f`, right red-orange `#ff633b`, bottom-left cyan `#31d8ff`, bottom-centre/right violet `#c174ff` / `#cd6aff`. Reads as orange→pink→violet with a cyan corner.
- Glyph ("Rexie", Rex's mascot): a stylised T-rex head in right-facing profile, cream/white (`#f8eee9`) with a frosted, slightly translucent look; jagged crest spikes along the back of the head (left edge), a single dark-purple eye (`#512879`), and a notched mouth. In the light/dark "plain" variants the head itself carries the gradient (orange→magenta→blue) on a white (`#ffffff → #ececec`) or near-black (`#313131 → #141414`) background; the standalone `Rexie` asset is the orange-gradient version (centre `#ff6239`).
- "BETA" pill: a frosted translucent capsule at the bottom with uppercase gradient-coloured (orange→magenta→violet) text; absent from the non-beta `AppIconLightPreview/DarkPreview` art.
- Named icon colours (sRGB from the catalog): `Color-6 #e19efc` + `Color-7 #9dc9f7` (Gradient-3, lavender→sky highlight), `Color-10 #491c5b → Color-11 #12325d` (Gradient-5), `Color-12 #26006a → Color-13 #1f0055 @0.7` (Gradient-6), `Color-14 #3f1764 → Color-15 #7e3294` (Gradient-7) — purple/navy shading layers **[inferred: eye/shadow]**; white at 0.4/0.6/0.9 alpha for the pill.
- The same gradient is reused in-app for the "server running" orb (`OrbServer`, sampled `#ff538b` / `#ff55b7`) and the Themes settings tile, so orange→pink→violet is the brand signal, not any single accent colour.

---

## 3. Colour palette

### 3.1 How Rex colours work
- Themes live in `Contents/Resources/SuperUI_SuperDesignTokens.bundle/Contents/Resources/themes.json` (41 bundled themes; 17 light, 24 dark). Each has `source` (terminal palette), `semantic` (73 UI tokens) and `cssVariables` (`--super-*`, for the hosted web client at `https://rex.superlogical.com`). The same tokens are compiled into that bundle's `Assets.car` as named colours `<theme-id>/<token>` (2,993 entries). There is no single app-wide accent: `accent` ranges from teal `#4fe3c1` (Abyssal Trench) to amber `#ffb642` (Cathode Amber) to pink `#ff4fd8` (Neon Arcade).
- Interface style (`Workspace.interfaceStyle`): `modern | system | useTheme | blendTheme` (+ `glass`, `classic`), each described by `Contents/Resources/MaterialStyles-*.json`. Shared geometry: pane corner radius 10, tab container radius 40 (pill tabs), inactive pane `contentOpacity` 0.7–0.8, hairline strokes at 7–10 % white.
- The user runs `interfaceStyle = useTheme`, `lightThemeID = merino-light`, `darkThemeID = merino-dark`, `paneDensity = comfortable`, `tabStyle = horizontal`, `tabIconColorMode = always`, `tabIconTintMode = off`, `inactivePaneFadeMode = both` (from `defaults read com.superlogical.rex`). Whether Merino is the factory default is not stated in the binary **[inferred: likely, it is the only neutral light/dark pair besides Silver Point]**.

### 3.2 Merino tokens (the palette the user actually sees)

| Role | Token | Merino Dark | Merino Light |
| --- | --- | --- | --- |
| Window canvas | `canvas` | `#0c0e11` | `#f6f7f9` |
| Pane/surface | `surface` | `#0f1319` | `#ffffff` |
| Sidebar / subtle surface | `surfaceSubtle` | `#131519` | `#eceef2` |
| Chrome / raised (tab bar) | `surfaceRaised` | `#1e2023` | `#ffffff` |
| Terminal background | `terminalBackground` | `#0d1117` | `#ffffff` |
| Primary text | `content` | `#e6edf3` | `#1f2328` |
| Secondary text | `contentSecondary` | `#82878c` | `#696d71` |
| Tertiary text | `contentTertiary` | `#666a6f` | `#878a8e` |
| Border | `stroke` / `strokeSubtle` | `#424549` / `#2e3135` | `#d1d2d5` / `#e7e9eb` |
| Accent / tint | `accent` | `#3485fa` | `#0667d8` |
| Accent solid (buttons, cursor, selection) | `accentSolid` | `#2f81f7` | `#0969da` |
| Accent container | `accentContainer` | `#142134` | `#e6effc` |
| Focused-pane ring **[inferred from `RexFocusRing.swift` + token names]** | `accentLine` / `accentRingOuter` | `#2f81f7` / `#3485fa @0.21` | `#0969da` / `#0667d8 @0.18` |
| Success | `success` | `#3fb950` | `#116329` |
| Warning | `warning` | `#d29922` | `#9d5c00` |
| Danger | `danger` | `#ff7b72` | `#cf222e` |
| Info | `info` | `#58a6ff` | `#0667d8` |

Screenshot check (`assets/screenshot-rex-window.png`, Rex was frontmost): tab bar `#1e2023` (= `surfaceRaised`), pane content `#131519`–`#16191b`, sidebar `#16181c`. Matches the dark tokens.

### 3.3 Program-status colours (what tabs, Dock badge and Settings use)
Rex's status art is custom raster/vector, not themed. Sampled from the Settings tiles (`assets/catalog/main__SettingsIconNoti*.png`, see `assets/sheet-ui-icons.png`):

| State (Rex name) | Art | Colour (ring) | Theme-token equivalent (dark / light) |
| --- | --- | --- | --- |
| **working** ("Shown when a program is busy or reports progress") | blue circle, three dots | `#3795ff` | `info` `#58a6ff` / `#0667d8` |
| **blocked** ("Shown when a program needs you to respond") | orange circle, "no entry" slash | `#ffa001` | `warning` `#d29922` / `#9d5c00` |
| **done** ("Shown when a program finishes a task") | green circle, check | `#79c243` | `success` `#3fb950` / `#116329` |
| **error** ("Shown when a program reports that something went wrong") | red circle, warning triangle | `#ff7047` | `danger` `#ff7b72` / `#cf222e` |
| idle | no indicator ("No processes are reporting activity"); menu bar shows "zzz" | — | `contentSecondary` |

Server/host state orbs: running = brand gradient (`#ff538b→#ff55b7`), attention = amber `#ffa201`, error = `#ff550f`, stopped/off = grey `#a9a9a9`, dev build = blue `#4885fe`, Tailscale = black `#171717`. Tooltips: "Rex server running", "Rex server stopped", "Rex needs attention", "Tailscale needs attention".

Bell: there is no bell-state colour. Terminal notifications are forwarded to macOS Notification Center (`Workspace.allowsTerminalNotifications`); the only bell art is the red Notifications settings tile.

---

## 4. Iconography

All SF Symbol names below were found as literal strings in `Contents/MacOS/Rex` (universal binary; each appears twice) with surrounding Swift file names giving the context. Confirmed = name present and context unambiguous; **[inferred]** = present but the exact usage is my reading.

| Concept | Rex uses | Status |
| --- | --- | --- |
| Session (sidebar/session picker) | `rectangle.stack` (palette category), new session `rectangle.stack.badge.plus`, remove `rectangle.stack.badge.minus`, filter `line.3.horizontal.decrease.circle(.fill)` | confirmed (`SessionPopupContentView.swift`, "Filter or create...") |
| Window / tab | `macwindow`, new window `macwindow.badge.plus`; move tab `arrow.right.square` / `arrow.left.square`; move pane to new tab `arrow.down.square` **[inferred]**; tab layout buttons `rectangle.grid.2x2`, `rectangle.split.2x2` (chrome customisation) | confirmed (`HorizontalTabBarView.swift`, `ChromeCustomizationMenu.swift`) |
| Block / pane / terminal | custom symbol `custom.shell` (a `>_` prompt glyph) and the template glyph `block-glyph-terminal` (same `>_`); unsupported block `questionmark.square.dashed`; broken terminal stream `exclamationmark.terminal`; "Session View Failed" `exclamationmark.triangle` | confirmed (`BlockUI.*.swift`); the UI word is **Pane** |
| Split | Split Right `rectangle.split.2x1`, Split Down `rectangle.split.1x2` (pane header buttons, visible in screenshot) | confirmed (`TabItemView.swift`) |
| Zoom | zoom `arrow.up.left.and.arrow.down.right`; unzoom `arrow.down.right.and.arrow.up.left`; move/best-fit `arrow.up.and.down.and.arrow.left.and.right` **[inferred which]** | confirmed (`WindowSplitView.swift`) |
| Close | `xmark` (pane header), `xmark.circle.fill` (clear search), custom `custom.xmark.capsule`, `custom.text.menu.badge.xmark` | confirmed |
| Host (local and remote) | `RemoteHostIcon` enum in `SavedHost.swift`: `globe`, `server.rack`, `cloud`, `macbook`, `macmini`, `macstudio`, `desktopcomputer`. The local host header ("wasssup · This Mac") shows `macbook`. Add host: `custom.globe.badge.plus`. Pairing: `desktopcomputer.and.macbook`. | confirmed; the per-host choice is user/device based **[inferred: picked from `hw.model`]** |
| Program / agent in a tab | `SuperBlockIcons` bundle: 80 monochrome template vectors `block-glyph-<app>` (amp, claude, codex, copilot, cursor, gemini, grok, devin, opencode, ollama, pi, prime-agent, poolside, crush, mastra, git, github, jj, docker, kube, terraform, vault, nomad, consul, packer, vagrant, waypoint, boundary, node, bun, uv, python, ruby, rust, go, swift, zig, dart, flutter, clang, gnu, nix, brew, vim, neovim, emacs, hx, kakoune, jupyter, postgres, sqlite, htop, btop, top, log, caffeinate, sleep, fx, d2, hunk, inspector, azure, cloudflare, vercel, heroku, railway, render, modal, shopify, stripe, tailscale, rex, terminal, placeholder) plus `block-silhouette-modal`. Colour comes from per-app mesh gradients compiled into the binary (`BlockIconGradient`, `BlockIconDefinitions`; hex values are not recoverable as strings). Screenshot shows Claude's asterisk in orange, Codex's spiral in white, `>_` for zsh. See `assets/sheet-block-glyphs.png`. | confirmed |
| Program status in tabs/activity | Custom art, not SF Symbols: blue "three dots" circle (working), orange slashed circle (blocked), green check circle (done), red warning-triangle circle (error). Tab tooltips for blocked kinds: "Waiting for permission", "Waiting for an answer", "Waiting for a password". Settings key `Workspace.showsProgramStatusInTabs`; view `TabStatusIndicatorView.swift`. Tab icons bounce on attention (`bouncesTabIcons`, `attentionBadge`). | confirmed art; the exact in-tab glyph per blocked kind is **[inferred]** to reuse this art |
| Idle | nothing in the tab; menu-bar/Rexie "zzz" (`MenuBarIconOff`, `block-glyph-sleep`) | confirmed |
| Bell | none (see 3.3) | confirmed absence |
| Server / menu bar | Rexie silhouette with badges: `MenuBarIconOn/Off`, `MenubarIcon1–4` (count dots), `MenubarIconAttention(On)` (!), `MenubarIconError` (×); server orbs `OrbServer*`; stop `stop.circle.fill`, restart `arrow.clockwise.circle.fill` | confirmed |
| Sidebar / chrome | `sidebar.trailing`, `menubar.rectangle`, `square.stack.3d.up` + "Show idle processes" **[inferred: activity list]**, `eye` (show/hide pane headers or idle) **[inferred]** | confirmed names |
| Command palette categories | `folder` (Go to Directory), `textformat.size` (font), `ladybug` (diagnostics), `chevron.forward`, `arrow.left`/`arrow.up` (focus), `bolt.slash`, `gauge.with.dots.needle.33percent` (diagnostics), `shippingbox.fill` + `arrow.down.circle.fill` (updates), `arrow.triangle.2.circlepath` (sync), `checkmark.circle.fill` ("Copied…"), `exclamationmark.triangle.fill` (theme import error), `doc.on.clipboard` | confirmed names |
| Settings tiles (custom art) | Interface (traffic lights), Terminal (`>_` on green), Themes (palette on brand gradient), Remote Hosts (globe on purple), Shortcuts (⌘ on grey), Results (magnifier on blue), Developer (hammer on grey), Notifications (bell on red), Server (orb) | confirmed (`SettingsIcon*` assets) |

Typography: the UI uses the system font (`systemFontOfSize:weight:`, `monospacedDigitSystemFontOfSize:weight:`; no UI font is bundled). The only shipped font is `SymbolsNerdFont-Regular.ttf` inside the Ghostty render bundle (terminal glyph fallback). The web client's CSS stack is `-apple-system, "SF Pro Text", Inter, system-ui, sans-serif` and `"SF Mono", Menlo, Consolas, monospace` (plus "JetBrainsMono Nerd Font Mono", "JuliaMono Braille", "DejaVu Sans Mono" as terminal fallbacks). `Workspace.terminalFontName` is unset on this machine (Ghostty default).

---

## 5. Naming and tone

Object model and vocabulary (CLI help `rex --help`, `rex actions`, binary strings):

| Layer | CLI / API word | UI word | Notes |
| --- | --- | --- | --- |
| Server | server, host | Rex server; hosts = "This Mac" + "Remote Hosts" | `rex hosts`, `rex home`, `rex whoami`; hosts are labelled, Tailscale/HTTPS |
| Session | session | Session | "New Local Session", "New Session on Host", "Rename Session", "Previous Session", "Open Session on Web", "Collapse Session" |
| Window | window | **Tab** | "New Tab in Session", "Rename Tab", "Move Tab Forward/Backward", "Show Previous Tab", "Toggle Tab Style"; action ids `client.tab.*` |
| Block | block | **Pane** | "Split Pane Right", "Focus Pane Right", "Move Pane to New Tab", "Show/Hide Pane Headers"; action ids `pane.split.right`, `pane.focus.right`. The word "Block" never appears Title-Cased in UI strings (0 hits vs 27 for "Pane"); it is the API/plugin term (`rex block`, `rex split`, creator `com.superlogical.terminal`) |
| Client | client | (the app) | `-C`, `client.theme.change`, `client.palette.toggle` |
| Program state | `idle` `working` `done` `blocked` `error`; blocked `kind` = `permission` `question` `auth`; `app` id e.g. `claude-code` | "Program Activity" section; "working status / blocked status / error status / done" | OSC 7501 protocol doc |

Casing conventions:
- Commands, menu items, action titles: Title Case, verb first ("Split Right", "Go to Directory", "Add Remote Host", "Change Theme", "Open Config File"). Minor words lower ("in", "on", "to").
- Tooltips, descriptions, notices: sentence case, short declarative, no exclamation marks, typographic apostrophes ("Waiting for permission", "No processes are reporting activity", "The connection dropped. Sessions stay open while Rex reconnects.").
- State words are lowercase nouns in running text; counts read "N blocked · N working" style.
- Action identifiers are dotted lowercase (`client.tab.new`, `pane.zoom`, `session.previous`); Lua config is `rex.bind("cmd+k>z", "pane.zoom")`.
- Tab title pattern: `<program> <directory>` ("zsh ~/w/swift-window-hints"); pane header: `<program glyph> <title> | <directory>`; session names are user-chosen; host header `<session name>` over `This Mac`.
- Tagline: "The multiplexer for all work." Mascot name: Rexie.
- Settings sections: Server, Interface, Themes, Terminal, Shortcuts, Notifications, Remote Hosts, Developer.

---

## 6. Recommendations for the Raycast extension

Verified against the installed `@raycast/api` 2.7.3 typings (`node_modules/@raycast/api/types/index.d.ts`): all `Icon.*` and `Color.*` names below exist. Raycast cannot render SF Symbols or Rex's asset catalogs, so every Rex symbol needs a Raycast `Icon` or a bundled SVG/PNG.

1. **Extension icon.** Use `assets/rex-app-icon-512.png` (already 512×512, the exact Dock rendering) during development; the "Plain" dark variant (`assets/catalog/main__PlainAppIconDarkBeta.png`, 1024 px, resize to 512) is cleaner on Raycast's dark grid. For Store submission the artwork belongs to Superlogical: either get permission or draw a derivative Rexie silhouette on the orange→pink→violet gradient (`#ff671b → #f3658f → #cd6aff`, cyan `#31d8ff` corner). Keep the squircle shape; Raycast masks it anyway.

2. **Icon mapping (SF Symbol → `Icon`).**
   - Session (`rectangle.stack`) → `Icon.Layers`; "new session" → `Icon.PlusTopRightSquare`. The current `Icon.AppWindowList` for sessions is acceptable but reads as "tab"; `Layers` keeps the stacked-rectangles idea.
   - Window/tab (`macwindow`) → `Icon.AppWindow` (current). Multi-pane layout count (`rectangle.grid.2x2`) → `Icon.AppWindowGrid2x2` (current).
   - Pane/terminal (`custom.shell` `>_`) → `Icon.Terminal` (current). Unsupported block → `Icon.QuestionMarkCircle`.
   - Split Right / Split Down → `Icon.AppWindowSidebarRight` / `Icon.AppWindowList` (no true split glyphs in Raycast); Zoom → `Icon.Maximize` (or `Icon.ArrowsExpand`), Unzoom → `Icon.Minimize`; Move → `Icon.Move`.
   - Local host (`macbook`/`macmini`/`macstudio`/`desktopcomputer`) → `Icon.Monitor` (or `Icon.Desktop`); remote host `globe` → `Icon.Globe`, `server.rack` → `Icon.HardDrive`, `cloud` → `Icon.Cloud`, Tailscale → `Icon.Network`. If the CLI exposes the host's icon name, map 1:1 with that table.
   - Filter → `Icon.Filter`; refresh (`arrow.clockwise.circle`) → `Icon.ArrowClockwise` (current); sidebar → `Icon.Sidebar`; command palette → `Icon.CommandSymbol`; themes → `Icon.Swatch`; diagnostics (`ladybug`) → `Icon.Bug`; directory → `Icon.Folder`.
   - Program status (match Rex's own art, not generic shapes): working → `Icon.CircleEllipsis` (Rex's blue three-dot circle; `Icon.CircleProgress` is an acceptable spinner alternative), done → `Icon.CheckCircle`, blocked (generic) → `Icon.CircleDisabled` (Rex's orange slashed circle) with per-kind detail icons permission → `Icon.Important`, question → `Icon.QuestionMarkCircle`, auth → `Icon.Lock`, error → `Icon.Warning` (Rex uses a warning triangle, not an ×; replace the current `Icon.XMarkCircle`), idle → `Icon.Circle` in `Color.SecondaryText` or `Icon.Moon` to echo Rex's "zzz".
   - Agents/programs: Rex shows brand glyphs per program. Those SVGs are third-party trademarks inside Rex's bundle; do not copy them. Use `Icon.Stars` for agent programs and `Icon.Terminal` for shells, or ship your own simple glyphs in `assets/` and pass them with `tintColor`.

3. **Status tint colours.** Rex's status hues are system-palette-like, so `Color.Blue / Color.Green / Color.Orange / Color.Red` (current) are faithful. To match the Merino theme exactly, use `Color.Dynamic` with `adjustContrast: true`: working `{ light: "#0667d8", dark: "#58a6ff" }`, done `{ light: "#116329", dark: "#3fb950" }`, blocked `{ light: "#9d5c00", dark: "#d29922" }`, error `{ light: "#cf222e", dark: "#ff7b72" }`, idle `Color.SecondaryText`. Use the accent `{ light: "#0667d8", dark: "#3485fa" }` only for "active/focused" markers (current `Color.Blue` on the active window is right). Keep the brand gradient colours (`#ff671b`, `#f3658f`, `#cd6aff`) out of status accessories; at most one warm tag such as `Tag` "This Mac" in `#f3658f`.

4. **Vocabulary in user-facing text.** Follow Rex's UI, not its CLI: say **Session / Tab / Pane** (keep "window", "block" only in `keywords` and code). Rename accordingly: "Search Windows" → "Search Tabs", "Jump to Terminal" → "Jump to Pane", accessory tooltip "N terminals" → "N panes". Title Case for command and action titles ("New Tab in Session", "Split Right"), sentence case for descriptions and tooltips, lowercase state words in tags ("Claude Code · working" already matches Rex's `<program> · <state>` phrasing). Use Rex's exact blocked tooltips: "Waiting for permission" / "Waiting for an answer" / "Waiting for a password", and "No processes are reporting activity" for the idle empty state. Call the status group "Program Activity".

5. **List layout mirroring Rex's tab/pane header.** Row title = pane title, subtitle = `<program> <directory>` (Rex's tab title pattern), left icon = program glyph tinted by status (Rex tints/bounces the tab icon on attention), right accessories = status tag first, then host icon (`Icon.Monitor`/`Icon.Globe`) for sessions on other hosts. Group sections by session with the session name as the section title and the host as its subtitle ("wasssup · This Mac"), which is exactly Rex's sidebar hierarchy. Keep previews (`rex capture`) in a Markdown code block so they inherit Raycast's monospace, matching Rex's terminal panes.

---

## Appendix: produced files and commands

- Brief: `rex-design-brief.md` (this file)
- Icon: `assets/rex-app-icon-512.png`, `assets/rex-app-icon-raw.png`; all catalog renders in `assets/catalog/` (167 PNGs: app-icon variants, settings/menu-bar/orb/status art, 4 custom symbols, 80 block glyphs)
- Contact sheets: `assets/sheet-app-icons.png`, `assets/sheet-ui-icons.png`, `assets/sheet-block-glyphs.png`
- Screenshot (Rex was frontmost; contains the user's terminal text, keep private): `assets/screenshot-rex-window.png`
- Raw data: `extract/assetutil-*.json` (three `assetutil --info` dumps), `extract/strings-*.txt` (Rex, RexTerminal, RexActions, SuperSplit, RexSync, RexAPI, RexSyncTerminal, GhosttyTerminal), `extract/all-asset-names.txt`, `extract/AppIconBeta.iconset/`
- Scripts: `scripts/extract_icons.swift` (NSWorkspace icon render + `Bundle.image(forResource:)` / `NSColor(named:)` dump), `scripts/list_windows.swift`
- Read-only commands used: `assetutil --info`, `strings`, `sips`, `iconutil -c iconset`, `defaults read com.superlogical.rex`, `rex --help`, `rex config --help`, `rex do --help`, `rex actions`, `screencapture -l <window>`; no theme, session or config change was made.
- Not found anywhere: a documented default theme id, the per-program block-icon gradient hex values (compiled Swift data), and the exact SF Symbols used inside `TabStatusIndicatorView` (the status art is custom).


---

## Addendum (2026-10-13): block icon definitions recovered from the binary

The per-program chip colours were not recoverable as strings because `BlockIconDefinition` stores them as `Int`
(`backgroundHex`, `foregroundHex`, gradient stop `colorHex`), built at runtime by a Swift initializer in
`Contents/MacOS/Rex`. `scripts/rex-icons/emulate-definitions.py` runs that initializer under the Unicorn CPU
emulator (chained fixups resolved, Swift runtime calls stubbed) and dumps all 74 definitions to
`scripts/rex-icons/block-icon-definitions.json`: glyph id, title, background and foreground colour, optional
linear/radial/mesh gradients, glyph background, and the `commands` aliases Rex matches process names against.
`scripts/rex-icons/render-chips.py` turns them into `assets/chips/*.png`. Rex keeps light chips light in dark
mode (Codex stays a white chip), so one rendering per program is enough.
