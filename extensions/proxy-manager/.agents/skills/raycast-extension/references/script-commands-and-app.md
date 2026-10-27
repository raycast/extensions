# Script Commands spec and Raycast app features

> Distilled from github.com/raycast/script-commands docs and manual.raycast.com (API 2.5.0, @raycast/utils 2.3.0). Tags like `[Manifest]` name the source page. When a fact looks stale, re-check it live: `curl -s 'https://developers.raycast.com/readme.md?ask=<question>'`, or grep the full dump (`curl -sL https://developers.raycast.com/llms-full.txt` plus `/llms-full.txt/1`).

Sources: [SC-README] github raycast/script-commands README; [SC-ARGS] documentation/ARGUMENTS.md;
[SC-OUT] documentation/OUTPUTMODES.md; [MAN] Raycast manual (manual-full.txt, v2, updated Aug-Sep 2026);
[DEV-DL] raycast/extensions docs/information/lifecycle/deeplinks.md; [APP] read from the installed Raycast.app bundle and verified against its log.

## Script Commands: metadata keys (all `# @raycast.<key> <value>`; `//` comments also OK)
- Required: `schemaVersion` (only `1` exists), `title` (root-search name), `mode`. Missing any = script silently not listed. [SC-README]
- `packageName`: subtitle in root search; if omitted, INFERRED FROM THE SCRIPT DIRECTORY NAME. [SC-README]
- `icon`: emoji, file path (relative or absolute), or https URL only. PNG/JPEG only; recommended ~64px. [SC-README]
- `iconDark`: same format as icon, used in dark theme; falls back to `icon` (app 1.3.0+). [SC-README]
- `currentDirectoryPath`: working dir for the run. Default = the script's own folder (relative paths resolve there). Accepts absolute, script-relative, and `~` paths. [SC-README][MAN]
- `needsConfirmation`: `true` shows a confirm alert before running (for destructive scripts). Default `false` (0.30+). [SC-README]
- `refreshTime`: inline-mode only. Units `s|m|h|d` (e.g. `10s`, `1m`, `12h`, `1d`). MINIMUM 10s. Timing is best-effort (OS scheduling). Only the FIRST 10 inline commands auto-refresh; the rest refresh only when you navigate to them and press Return. [SC-README]
- `argument1`..`argument3`: JSON, see Arguments below (1.2.0+). [SC-README]
- `author`, `authorURL` (social/site/email), `description`: documentation fields (community repo docs). [SC-README]
- `platform`: `macos` (default) or `windows`. [SC-README]

## Script Commands: arguments (`@raycast.argumentN <json>`)
- MAX 3 arguments. [SC-ARGS]
- Keys: `type` (required; `"text"` | `"password"` | `"dropdown"`, type field needs app 1.64.0+). [SC-ARGS]
- `placeholder` (required): label shown in the search-bar input. [SC-ARGS]
- `optional: true` makes it optional; default is REQUIRED, and Raycast refuses to run with it empty. [SC-ARGS]
- `percentEncoded: true`: Raycast percent-encodes the value before passing (for URL query use). [SC-ARGS]
- `data`: required when `type` is dropdown; array of `{"title": "...", "value": "..."}`; script receives `value`. [SC-ARGS]
- `secure`: DEPRECATED, use `"type": "password"` (input shown as asterisks). [SC-ARGS]
- Values arrive as positional `$1`, `$2`, `$3`. Omitted optional args arrive as empty strings. [SC-ARGS example, inferred]
- Example: `# @raycast.argument1 { "type": "dropdown", "placeholder": "env", "data": [{"title":"Prod","value":"prod"},{"title":"Staging","value":"stg"}] }`
- Alias + space auto-focuses the first argument field; Left/Right arrows move between fields. [SC-ARGS][MAN]

## Script Commands: modes, output, exit codes
- `fullOutput`: entire stdout in a separate terminal-like view. Only mode that tolerates long-running/partial-output tasks. [SC-OUT]
- `compact`: LAST line of stdout shown in a toast. [SC-OUT]
- `silent`: LAST line (if any) shown as HUD after the Raycast window closes. [SC-OUT]
- `inline`: FIRST line of stdout shown inside the root-search item; re-runs per `refreshTime`. `inline` WITHOUT `refreshTime` silently falls back to `compact`. Tip: favorite inline items to make a dashboard. [SC-OUT]
- Chatty long-running output (e.g. `zip` without `-q`) BREAKS compact/silent/inline; quiet the tool (`zip -q`) or use fullOutput. [SC-OUT]
- Non-zero exit = failure toast "script failed". In inline/compact, the LAST line of output becomes the error message, so `echo "reason"; exit 1`. [SC-README]
- ANSI colors supported in `fullOutput` and `inline` only. Colors 30-36/97 fg, 40-46/107 bg, auto-adapted to light/dark theme; 8-bit and 24-bit codes also work. Other codes: 0 reset, 4 underline, 9 strikethrough, 24/29 undo those. Unsupported codes are stripped. [SC-OUT]
- Bash: `echo -e '\033[31;42mred on green\033[0m'`; tput needs `export TERM=linux` first. [SC-OUT]

## Script Commands: files, discovery, environment
- Any filename containing `.template.` is IGNORED (community convention: must fill in values, then rename). [SC-README]
- Discovery: Raycast 2: Settings -> Script Commands -> Add Script Directory (v1: Settings -> Extensions -> + -> Add Script Directory); every script file in the folder is indexed. Metadata edits (rename, add argument, change mode) are picked up automatically, no restart. [SC-README][MAN]
- "Create Script Command" scaffolds a file from a language template with the header pre-filled. [MAN]
- Not appearing? check: `.template.` in name, all 3 required keys, `#` or `//` comment prefix; then diff against an official template. [SC-README]
- Don't point Raycast directly at a cloned community repo folder (restructures = commands appear/vanish); copy scripts into your own dir. [SC-README]
- Languages (Mac): whatever the shebang names; built-in support for AppleScript (`.applescript`, `.scpt`), bash, zsh, Python, Node.js, Ruby, PHP, Swift. Prefer `.applescript` over compiled `.scpt` (diffable). [MAN]
- Runs in a NON-login shell; Raycast appends `/usr/local/bin` to PATH (NOT `/opt/homebrew/bin`). For login shell use `#!/bin/bash -l`, or `export PATH=...` at top. [SC-README]
- `LANG` is set to your regional locale (fallback `C.UTF-8`), so date/number output matches system settings. [MAN]
- TCC prompts (Accessibility, Automation, Full Disk Access) are attributed to the RAYCAST app, not Terminal; grant there. macOS 27 renames Accessibility to "Device Control and Data Access". [MAN]
- Community repo rule: bash scripts must pass ShellCheck. Worth doing locally too. [SC-README]
- A script whose FIRST argument is text (others optional) can be a Fallback Command (Settings -> Launcher -> Fallback Commands); root-search text is passed as `$1`. [MAN]
- Make hotkey/refresh-triggered scripts idempotent (toggle > on/off pair, "ensure X" > "create X"). [MAN]

## Deeplinks (raycast://)
- Every root-search command has Action Panel -> "Copy Deeplink" (secondary copy shortcut shift-cmd-C). Use it to get the exact URL instead of guessing. [MAN]
- Extension commands: `raycast://extensions/<author-or-owner>/<extension-name>/<command-name>`; values = package.json `owner`/`author`, `name`, command `name`. Built-ins: author `raycast`, slugified names (e.g. `raycast://extensions/raycast/calendar/my-schedule`). [DEV-DL]
- Query params: `launchType=background|userInitiated` (background skips fronting Raycast), `arguments=<url-encoded JSON>` (keys = argument names), `context=<url-encoded JSON>` (LaunchContext), `fallbackText=<string>` (prefill search bar / first text input). [DEV-DL]
- Launching a command by deeplink makes Raycast ask the user to confirm first. [DEV-DL]
- Known built-ins: `raycast://extensions/raycast/raycast/store`, `raycast://extensions/raycast/raycast/send-feedback`. [MAN]
- Focus: `raycast://focus/start?goal=Deep%20Focus&categories=social,gaming&duration=300&mode=block`, `raycast://focus/toggle`, `raycast://focus/complete`. [MAN]
- Window mgmt: `raycast://customWindowManagementCommand?&name=MyCommand&position=center&absoluteWidth=500.0&relativeHeight=0.5&absoluteXOffset=0.0&absoluteYOffset=0.0`. `name` matching an existing custom command ignores the other params; omit `name` for a one-off temp command; `relative*` = % of screen, ignored if the `absolute*` twin is set. Window LAYOUT deeplinks accept only `name`. [MAN]
- Built-ins and script commands (verified against Raycast 2.8's own deeplink builder in `Raycast.app/.../backend/index.mjs`): `raycast://extensions/raycast/<slug(extension title)>/<slug(command title)>`, e.g. `raycast://extensions/raycast/snippets/search-snippets`; script commands use extension `script-commands` and the slug of `@raycast.title` (`raycast://extensions/raycast/script-commands/hourly-rate-to-annual-salary-calculator`). Slug = NFD, strip accents, lowercase, trim, drop everything but `a-z0-9 -`, spaces to `-`, collapse `--`. Script arguments go as repeated `arguments=<value>` params (not JSON). A wrong slug logs `Command not found: <slug> in <extension>`. The old `raycast://script-commands/<file-slug>` form is not what Raycast generates. Quicklinks: still use Copy Deeplink. [APP]
- AI Projects also expose Copy Deeplink; old "folder" deeplinks still resolve after v2 rename to Projects. [MAN]

## Aliases
- Allowed chars: a-z, 0-9, space only; auto-lowercased; multi-word OK (space shown as a visible-space glyph). No special chars. [MAN]
- Strict PREFIX matching (not fuzzy): exact alias = top result; prefix = boosted. Take effect immediately. [MAN]
- Set: select command -> cmd-, (or cmd-K -> Configure Command) -> Set Alias; or Settings -> Shortcuts. [MAN]
- [MAN] Alias + space on a command with arguments focuses its first argument field (how `t 5` works). Configure Command from root search is ⇧⌘, ; it also has Delete Alias / Delete Hotkey. Aliases show as a badge beside the command in root search.

## Hotkeys
- Global; work with Raycast closed. Set via Configure Command -> Set/Record Hotkey or Settings -> Shortcuts. Recorder auto-saves after ~1.5s (Return saves now, Backspace clears). [MAN]
- Types: modifier+key; multi-modifier only (opt-cmd); double-tap modifier (cmd cmd); single side-specific modifier (Right cmd); both-sided (L+R cmd, Mac); single key `fn`/globe (set macOS "Press fn key to" = Do Nothing first) and F13-F18. [MAN]
- Keys record as PHYSICAL position by default; click a key in the recorder to toggle key-equivalent (blue dot). Built-in Raycast shortcuts always use key equivalents. [MAN]
- Conflicts: the launcher hotkey can't be overwritten; another command's hotkey can (it loses it). Incompatible pairs flagged with red dot (single opt tap vs opt-opt double tap). [MAN]
- Settings -> Shortcuts has filters "Hotkey Set" / "Alias Set" to audit everything. [MAN]
- [MAN] A lone-modifier hotkey records the side pressed (small L / R); click the key in the recorder to cycle left → right → any side. Regular keys include F1-F24. A hotkey that stops firing: check Settings → Shortcuts (system updates can clear hotkeys) and that Raycast still has Accessibility.
- [MAN] Double tap (`⌘ ⌘`) and both-sides (`L⌘ R⌘`) are separate gestures that don't trigger each other; to open Raycast with both, set one as the launcher shortcut and bind the other to a Quicklink pointing at `raycast://`.

## Hyper Key
- Settings -> Keyboard -> Hyper Key: Caps Lock, any L/R modifier, or F1-F12. Mac emits ctrl-opt-cmd (+shift if "Include Shift"). Shown as a star glyph in UI. [MAN]
- Quick Press (Caps/F-key only): nothing / original key / Escape. [MAN]
- Secure Input (password fields) blocks it; "Secure Input Compatibility" fixes that but reserves Right Control. [MAN]
- Conflicts with Karabiner virtual keyboards / exclusive HID drivers. macOS Modifier Keys must map Caps Lock -> Caps Lock. Diagnostic: Settings -> Keyboard, green dot -> Hyper Key Diagnostic (restart button). [MAN]

## Action Panel / extension-action shortcuts (Root Search)
- cmd-K action panel; cmd-, or shift-cmd-, Configure Command; opt-cmd-, Configure Extension; ctrl-shift-cmd-D (or shift-cmd-D) Disable Command; shift-cmd-F / cmd-F Add to Favorites; "Reset Ranking" clears frecency. [MAN]
- Extensions can mark actions destructive (red), group into sections, and nest sub-menus. [MAN]
- Extension support: shift-cmd-B report bug, opt-cmd-F request feature. [MAN]

## Quicklinks
- Link can be URL, file/folder path (`~` OK), or any app deeplink (`shortcuts://run-shortcut?Name=...`). Optional Open With app (Mac). [MAN]
- MAX 3 arguments per quicklink. Syntax `{argument name="query"}`; same name reused = same value. [MAN]
- Import JSON: array of `{name, link, iconName?, openWith?}`; duplicates (same title+content) skipped. No openWith = default browser. [MAN]
- Settings: "Prefer Existing Tabs" (switch to open tab), "Pass Selected Text as Argument" (single-arg quicklinks via hotkey). [MAN]
- Assign alias/hotkey per quicklink in Settings -> Quicklinks. [MAN]

## Dynamic Placeholders (Quicklinks, Snippets, AI Commands)
- `{clipboard}` (`offset=1` = 2nd most recent, needs Clipboard History), `{snippet name="..."}`, `{cursor}` (one per snippet), `{date}`, `{time}`, `{datetime}`, `{day}`, `{uuid}`, `{selection}`, `{argument}`, `{calculator}`, `{browser-tab}` (needs Browser Extension). Availability varies by surface (manual footnotes are inconsistent; test). [MAN]
- Modifiers, chainable: `{clipboard | trim | uppercase}`; `uppercase`, `lowercase`, `trim`, `percent-encode`, `json-stringify`, `raw`. [MAN]
- Defaults: Quicklinks auto percent-encode; AI Commands wrap values in `"""`. Opt out with `| raw`. [MAN]
- Offsets: `{date offset="+2y +5M"}`, `{time offset="+3h +30m"}`; units m=min, h, d, M=month, y; case-sensitive; NO space after sign. [MAN]
- Format: `{date format="yyyy-MM-dd"}` (Unicode TR35 patterns; literals in single quotes). `format` and `locale` are mutually exclusive. [MAN]
- Locale: `{date locale="fr-FR"}`, hyphens not underscores; `{time locale="en-US-u-hc-h23"}` forces 24h. [MAN]
- Arguments: `{argument default="happy"}` makes it optional; `{argument name="tone" options="happy, sad, professional"}` = dropdown. Max 3 distinct. [MAN]
- `{browser-tab format="markdown|text|html"}`, `{browser-tab selector="a.author"}` CSS selector extract. [MAN]
- Valid placeholders turn blue in the editor; unstyled braces = typo. [MAN]

## Import & Export
- "Export Settings & Data" -> encrypted `.rayconfig` (passphrase >= 8 chars), 11 categories incl. Quicklinks, Snippets, MCP Servers, Store extensions, Settings/Aliases/Hotkeys, AI Commands/Agents. Cross-platform. [MAN]
- Import is selective (checklist) and additive: duplicate quicklinks (same link) and snippets skipped; nothing overwritten. [MAN]
- Script Directories / local dev extensions are NOT listed among exported categories; keep scripts in git. [MAN, inferred]
- Snippets/Quicklinks export separately as plain JSON (no passphrase). Scheduled exports (Pro): Settings -> Advanced -> Export. [MAN]
- [MAN] If a paid plan lapses, scheduled exports pause while preserving frequency and only reset to None if an account check >14 days later still sees no paid plan.

## Extensions (dev-relevant)
- `npm run dev` opens the extension in Raycast v2 if running, else v1; update with `npm install @raycast/api@latest` for current dev behavior. [MAN]
- Local dev extensions (Import Extension) never auto-update from Store; Store extensions update in background ("Check for Extension Updates" to force). [MAN]
- Settings -> Extensions sidebar groups: Built-in, Store, Script Commands, Quicklinks; per-command enable toggle + alias/hotkey. [MAN]

## AI Commands
- Prompt field: `@` inserts an AI Extension, `{` inserts a Dynamic Placeholder. Output Behavior: Open in Raycast | Replace Selection. Per-command model (no "use default" option). [MAN]
- Import from JSON ("Import AI Commands"); built-ins editable/duplicable (cmd-D) but not deletable. [MAN]
- AI Commands do NOT load Skills. [MAN]
- [MAN] Quick Fix (Settings -> AI -> Quick Fix, default double-press Right Shift) always runs on Raycast AI and spends AI credits even when AI Commands use a custom/local model.

## AI Extensions (tools)
- Invoke with `@name` in AI Chat, Quick AI, or Root Search; chain several. Built-ins incl. `@terminal`, `@finder`, `@clipboard`, `@file-search`, `@selected-text`, `@screen-awareness`, `@manual`. [MAN]
- Each extension's Settings page exposes an "Ask" tool with free-text Custom Instructions the AI reads before using its tools. [MAN]
- Permissions (Settings -> AI -> Tools): Ask / Auto (default; auto-allows read-only + everyday shell like `git status`, asks for `.env`/keys/destructive) / Always Allow. Auto-review Rules; "Always allow" adds to Globally Allowed Tools. [MAN]
- Store filter "AI Extensions" category (cmd-P) shows extensions that ship tools. [MAN]

## MCP
- Install MCP Server command: transport stdio (Command, Arguments as space string OR JSON array, Environment kv) or HTTP (URL, headers, OAuth Dynamic w/ PKCE or Static client id/secret). [MAN]
- Stdio servers inherit Raycast's env; after changing PATH/env vars you must RESTART Raycast. [MAN]
- Manage MCP Servers: Running/Stopped/Error status, details pane shows server stderr/output; Start/Stop/Restart/Logout/Uninstall. Each server gets `@name` and a root-search "Ask <Server>" command. Exported in `.rayconfig`. [MAN]
- [MAN] A Store extension can bundle its own MCP server (manifest `ai.mcp`, API 2.5.0): installing the extension installs and connects it, and it shows in Manage MCP Servers beside manual ones.

## Skills (Raycast AI)
- Scans `~/.claude/skills`, `~/.config/agents/skills`, `~/.config/raycast/skills`, `~/.agents/skills` (+ custom folders), TOP LEVEL ONLY. So Claude Code skills in `~/.claude/skills` are visible to Raycast AI automatically. [MAN]
- One subfolder per skill; folder name MUST equal frontmatter `name`; file exactly `SKILL.md`. `name` 1-64 chars `[a-z0-9-]`, no leading/trailing/double hyphen; `description` 1-1024 chars. Duplicate names: first found wins. Failures skipped silently. [MAN]
- Model sees only name/description/path catalog; description should lead with WHEN to use. Needs a tool-capable model. Folder scan cached ~60s. [MAN]

## Automations (AI)
- Settings -> AI -> Automations or `@automations`: Once/Hourly/Daily (or cron "Custom"); local device only, no sync, max 20 per device; needs Mac awake + Raycast running; missed runs fold into one run at next launch. [MAN]

## Troubleshooting
- Logs: "Copy Raycast Logs" / "Reveal Raycast Logs" commands; folder `~/Library/Logs/com.raycast.macos`. [MAN]
- Script not listed: see discovery checklist above. Script errors: run it in Terminal with `env -i` style minimal PATH to reproduce. [SC-README, inferred]
- Quicklink placeholders not replaced: check `{argument name="..."}` braces, <=3 args, placeholder name spelling. [MAN]
- Frozen: quit/reopen; "Copy Raycast Logs" first. Missing permission: grant to Raycast in Privacy & Security. [MAN]
- [MAN] A local dev extension misbehaving: bring `@raycast/api` up to date in `package.json`, `npm install`, then `npm run dev` again; `npx @raycast/api@latest dev` tries the newest CLI without touching `package.json`.

## Extensions Guidelines (Store; worth following for personal too)
- README must state setup: API keys, credentials, codes needed to connect. Collected data used only for the service. [MAN]
- Rejected if it duplicates a native feature (Quicklinks, Snippets, Clipboard History, Calculator) or an existing Store extension; one extension per service (extend, don't fork). [MAN]
- Name may not contain "Assistant". Must follow technical guidelines at developers.raycast.com/basics/prepare-an-extension-for-store. [MAN]
- PRs: stale after 14 days, closed after 21 days of inactivity. [MAN]

## Raycast 2 app (manual "New in v2", "Import & Export", "Extensions", "Script Commands", "Troubleshooting"; checked against Raycast 2.6.2)

- Raycast 2 replaces v1 in place (`/Applications/Raycast.app`, bundle id still `com.raycast.macos`); needs macOS Tahoe on Apple silicon. "Keep Both" at install leaves `Raycast` (still v1) and `Raycast 2`; fix = quit, delete both, reinstall. [MAN]
- Data paths unchanged: `~/.config/raycast/extensions/<name>/` (plus a `node_modules` symlink into the app bundle's `api/node_modules`), `~/Library/Application Support/com.raycast.macos/` (encrypted `.db` files), logs `~/Library/Logs/com.raycast.macos/raycast-x-*.log`.
- Migrate from Raycast v1: automatic prompt on first launch, or the **Migrate from Raycast v1** command later; needs v1 >= 1.104.16; additive, duplicates skipped; brings Clipboard History, Wrapped and Emoji customizations that a `.rayconfig` lacks. Importing v1 Settings, Aliases & Hotkeys overrides the v2 ones and offers to disable them in v1. Some macOS permissions must be granted again. [MAN]
- Custom (dev) extensions that didn't come across: re-import with `npx @raycast/api@latest dev` (`ray develop`), which targets v2 when it is running and v1 otherwise. 2.6.2's migration dropped every dev extension whose folder path had a space (SKILL.md section 3). [MAN + observed]
- `.rayconfig` export (Export Settings & Data): AI chats/commands/agents, Clipboard History, Quicklinks, Snippets, Notes, Emoji history, MCP servers, **Store extensions only**, Settings + Aliases + Hotkeys, Wrapped, Window layouts. Encrypted (passphrase >= 8 chars); Pro can schedule exports (Settings -> Advanced -> Export). Imports pick categories and merge, never overwrite. [MAN]
- Local extensions are managed by you: Check for Extension Updates and auto-update only touch Store installs; the app also has an **Import Extension** command. [MAN]
- Hotkeys and aliases: set straight from the Action Panel in root search (no trip to Settings); `fn` alone, double-tap modifiers, left vs right modifiers, physical vs key-equivalent recording; Settings has its own search sidebar; **Settings -> Shortcuts** lists all hotkeys ("System updates occasionally clear hotkeys"). [MAN]
- Script Commands: run with the regional `LANG` locale (falls back to `C.UTF-8`); a script whose first argument is text (others optional) can be a Fallback Command (Settings -> Launcher -> Fallback Commands). [MAN]
- Quick AI can be the fallback command; File Search results now appear in root search; Presets became Agents; Skills, Memory, Automations (scheduled AI prompts) and Projects are new. [MAN]
- Tahoe: Raycast must be in System Settings -> Menu Bar -> Allow in the Menu Bar, or menu-bar commands vanish. On macOS 27 Accessibility is renamed "Device Control and Data Access". [MAN Troubleshooting]
- Local extension misbehaving: keep `@raycast/api` current and `npm install` before `npm run dev`; `npx @raycast/api@latest dev` uses the latest CLI without editing package.json. [MAN Troubleshooting]
