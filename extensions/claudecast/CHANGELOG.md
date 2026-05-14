# ClaudeCast Changelog

## [1.8.0] - 2026-05-08

### Added

- **cmux Terminal Support**: Added cmux ([cmux.com](https://cmux.com)) as a first-class terminal alongside Terminal, iTerm, Warp, kitty, and Ghostty. Sessions launch via the macOS open-handler so cwd is set as the shell's process pwd, then the command types and submits via cmux's own input pipeline (no Accessibility permission needed). cmux honors the global Open In preference: New Tab uses the open-handler path; New Window uses cmux's AppleScript `new window` verb plus a typed `cd "<cwd>" && <command>`.
- **Usage Dashboard Revamp**: Real SVG bar chart for daily cost trend, side-by-side range comparison table, top projects table, top sessions table with project + first-message preview + cost. Sidebar metadata shows totals, token breakdowns, top projects as colored tags, and the most expensive session.
- **Auth Gate for Claude API Commands**: Ask Claude Code, Git Actions, Transform Selection, and Agentic Workflows preflight authentication before invoking the CLI. The check accepts Raycast preferences (`anthropicApiKey`, `oauthToken`), the env vars `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN`, and existing credentials reported by `claude auth status --json`. When none are present the user gets a friendly "Add token in preferences" toast instead of seeing the CLI's `/login` prompt inside the spawned process.

### Fixed

- **Cost Calculation: Streaming Chunk Deduplication**: Anthropic streams response chunks where each chunk's `usage` is cumulative. Naive summing inflated session totals by 2x to 4x. Now deduped by `(message.id, requestId)` so per-message totals reflect the final cumulative value once per request.
- **Cost Calculation: Sonnet 200K Token Tier**: Above 200K input tokens per message, Sonnet rates double across all token types (input, output, cache read, cache write). The pricing now applies a flat per-request high tier keyed off the message's input token count, matching Anthropic's billing.
- **Cost Calculation: Date-Range Filter Skips Timestampless Entries**: When a date range is active (today/week/month/daily chart), entries without a `timestamp` field are excluded. Previously they passed through the filter and inflated reported costs for users with older session files.
- **Cost Calculation: Opus 4.7 Pricing Row**: Added an explicit `opus-4-7` row at the $5/$25 tier. Without it, Opus 4.7 sessions matched the older `opus` substring and were billed at the $15/$75 tier (3x overcharge).
- **Cost Calculation: Daily Chart Bucketing**: Daily costs are now attributed to each day's actual usage timestamps. Previously a multi-day session stamped all of its cost on the file's last-modified date.
- **Cost Calculation: Opus 4.1 Pricing Row**: Added an explicit `opus-4-1` row at the $15/$75 tier for users still resuming pre-4.5 sessions.
- **OOM Crashes (menu-bar-monitor, usage-dashboard, browse-sessions)**: Multiple structural fixes for "JS heap out of memory" worker crashes affecting users with large session histories. Persistent LocalStorage cache for today's stats so menu-bar cold starts don't re-scan; `LaunchType.Background` skip of the project-discovery scan; bounded newest-first iterator in `listAllSessions` that stops statting once it has the top N; message and content caps in `getSessionDetail` (last 200 messages, 5KB per message) so browse-sessions detail view stops materializing megabyte arrays into React state; explicit stream-listener cleanup in `streamSessionUsage` for back-to-back invocations.
- **Terminal Launch: `$` Escape Bug**: Stopped escaping `$` in commands sent to Terminal.app and iTerm. Previously a command like `bash -c 'echo $SHELL'` would print the literal text `$SHELL` instead of expanding the variable.
- **`usage-dashboard` Redundant Daily Stats Scans**: The 7-day daily stats no longer reload on every range tab switch (today/week/month/all). Loaded once on mount.
- **`calculateStatsWithUsage` Mutation**: Stopped mutating SessionMetadata objects with computed costs. Top sessions are now a lightweight `{id, projectName, firstMessage, cost}` projection.
- **Per-Project Path Resolution**: Memoized within each stats call so each unique project directory is resolved at most once per call instead of once per session.
- **Session Detail View: Last 20 Messages**: Browse Sessions and Deep Search Sessions detail views now render the most recent 20 messages, with an accurate "Showing last N of M messages" notice keyed to the rendered count. The banner now appears for any session with more than 20 messages.
- **Kitty Window Mode**: Restored `--single-instance` so window-mode launches reuse the running kitty instance rather than spawning a separate process.

## [1.7.0] - 2026-05-05

### Added

- **Open In preference**: Choose whether Claude Code sessions open in a new window or a new tab. Supported across Terminal.app, iTerm, kitty, and Ghostty. kitty's New Tab requires `allow_remote_control yes` and a `listen_on` socket in `kitty.conf`; otherwise it falls back to a new window. Warp always opens a new window (its YAML launch config does not support opening in an existing window as a tab).

### Fixed

- **Reserved shortcut**: "Continue with Prompt" in Launch Project changed from `⌘P` to `⌘⇧P` to avoid conflict with a Raycast reserved shortcut.

## [1.6.0] - 2026-05-04

### Fixed

- **Ghostty Terminal Launch**: Replaced System Events keystroke simulation with Ghostty's native AppleScript surface API. The previous approach typed commands into whichever window was focused, interfering with active sessions.
- **Warp Terminal Launch**: Replaced the non-functional `warp://action/new_tab?command=` URL scheme with a temporary YAML launch configuration opened via `warp://launch/`. Reliably opens a new window with the correct working directory and command. Double quotes in the cwd path are escaped, and the temp config cleanup window is 30 seconds to handle cold launches.

### Changed

- **Extension description**: Refreshed the store and repository description to highlight session search, instant resume, and agentic automation alongside quick prompts.

### Contributors

- Ghostty and Warp terminal launch fixes by [@Haknt](https://github.com/Haknt) ([#1](https://github.com/qazi0/claude-cast/pull/1))

## [1.5.0] - 2026-04-30

### Added

- **Launch Project Preferences**: Configurable Permission Mode and Model Override settings for the Launch Project command. All launch actions (New Session, Continue Last, Continue with Prompt) respect these preferences.
- **Deep Search Permission Restore**: Sessions resumed or forked from Deep Search now restore the original permission mode.

### Fixed

- **Model Flag on Resume**: Removed explicit `--model` flag when resuming or continuing sessions. Claude Code remembers the model internally, and passing `--model` explicitly could disable features like extended context windows (1M). The `--model` flag is now only used for new sessions via the Launch Project model preference.

## [1.4.0] - 2026-04-13

### Fixed

- **Underscore Path Resolution**: Projects with underscores in their path (e.g. `my_project`) now resolve correctly when browsing sessions. Claude Code encodes underscores as dashes in directory names, and the filesystem walk now probes underscore variants alongside dash variants.
- **encodeProjectPath**: Updated to replace `_` with `-` alongside `/` and `.`, matching Claude Code's actual encoding behavior.

### Added

- **Permission Mode Restore on Resume**: Sessions started with non-default permission modes (e.g. `bypassPermissions`, `auto`, `plan`) now resume with the same mode. The `permissionMode` is parsed from session JSONL and passed as `--permission-mode` flag to Claude Code.
- **Model Restore on Resume**: Sessions now resume with the same model they were started with (e.g. a Haiku session won't unexpectedly resume with Opus). The model is passed as `--model` flag to Claude Code.

## [1.3.0] - 2026-04-06

### Added

- **Deep Search Match Snippets**: Search results now show contextual match snippets in a detail side panel
  - Displays 15 words before and after the matched phrase with the match highlighted in bold
  - Shows full session prompt, summary, project path, turns, cost, and last modified date
  - Split-pane layout: results list on the left, match context on the right
- **Menu Bar Icon**: Now shows the ClaudeCast extension icon instead of a status circle
- **Configurable Cost Display**: Today's cost in the menu bar is now off by default and can be enabled in the command's preferences

### Fixed

- **Usage Dashboard Cost Calculation**: Fixed costs always showing $0.00
  - Previously read a nonexistent `costUSD` field from session data
  - Now computes costs from actual token counts (input, output, cache read, cache write) using per-model pricing via a dedicated streaming scanner
  - Usage Dashboard summary table now shows token breakdowns (input, output, cache read, cache write) with K/M formatting
  - Supports Opus, Sonnet, and Haiku pricing tiers
  - Separated metadata parsing (50-line cutoff for UI previews) from usage accounting (full-file streaming scanner) to ensure accurate totals
  - Time-range views (Today/Week/Month) now filter tokens by entry timestamp, not file modification time
- **Render Tree JSON Crash**: Fixed "Cannot parse render tree JSON: expected low-surrogate code point" error
  - Added `sanitizeString()` to strip lone UTF-16 surrogates from session JSONL data at ingress
  - Added `safeTruncate()` to prevent `.slice()` from splitting valid surrogate pairs at preview boundaries
  - Applied across browse-sessions, deep-search-sessions, and usage-dashboard
- **Tilde Expansion in Project Paths**: Fixed `~/path` not expanding in Ask Claude and Prompt Library
  - Added `expandTilde()` helper using `os.homedir()` applied at Ask Claude, Prompt Library (including Ralph Loop), and the shared terminal launcher
  - Added error handling with toast notifications for the "Open Full Session" action

## [1.2.0] - 2026-02-20

### Added

- **Deep Search Sessions**: New command that searches through full session content across all Claude Code conversations
  - Streams through JSONL files incrementally, showing results as they're found
  - Debounced search with AbortSignal cancellation when query changes
  - Searches all message content (user and assistant) case-insensitively

### Fixed

- **Project Path Resolution**: Fixed "Project path no longer exists" error when browsing sessions
  - Claude Code encodes both `/` and `.` as `-` in directory names, making the previous naive decode incorrect for usernames with dots or project names with dashes
  - Added three-tier resolution: sessions-index.json (authoritative), filesystem-guided walk, naive decode (fallback)
  - Fixed `encodeProjectPath` to correctly encode both `/` and `.`

## [1.1.0] - 2026-01-27

### Added

- **Ralph Loop**: Autonomous agentic loop that breaks down complex tasks and executes them with fresh context per iteration
  - Two-phase approach: Planning phase creates atomic task breakdown, execution phase runs each task in a fresh Claude session
  - Full TUI visibility during Claude sessions (no garbled output)
  - Signal-based termination using marker files
  - Resume functionality via `.ralph/resume.sh` script when max iterations reached
  - Graceful stop support via `touch .ralph/stop`
- **Anthropic API Key Support**: Added alternative authentication method for pay-as-you-go users
  - Set `ANTHROPIC_API_KEY` in preferences alongside existing OAuth token option
- **Claude Installation Check**: All commands now verify Claude CLI is installed and show helpful install instructions if missing

### Fixed

- **Memory Leak in Menu Bar Monitor**: Fixed JS heap out of memory crashes
  - Proper stream cleanup in session parser (readline interfaces now disposed correctly)
  - Added 30-second in-memory caching for today's stats to prevent repeated file parsing
  - Query optimization with `limit` and `afterDate` options to skip unnecessary files
  - Lightweight project discovery that counts files instead of parsing all sessions
- **Duplicate React Keys in Browse Sessions**: Fixed console errors from duplicate session IDs across projects
  - Added deduplication logic that keeps the most recently modified session
- **Ask Claude Code Context Capture**: Fixed stale VS Code cache being read
  - Changed to manual context capture (⌘G) instead of auto-capture on load
  - Project path now persists across sessions via LocalStorage
- **Path Validation**: Added existence checks before launching projects to prevent errors on deleted directories

### Changed

- **Ralph Loop UI**: Renamed from "Ralph Loop (Fresh Context)" to "Ralph Loop" with cleaner description
- **Task Input Fields**: Ralph Loop task and requirements fields now use multiline TextArea for easier editing
- **Loading States**: Added animated toast "Preparing Ralph Loop..." while script generates

## [Initial Release] - 2026-01-23

### Added

- **Ask Claude Code**: Quick prompts with VS Code context capture
- **Project Launcher**: Browse and launch projects with favorites
- **Session Browser**: Find and resume Claude Code conversations
- **Quick Continue**: One-keystroke session continuation
- **Git Actions**: Review staged changes, write commit messages
- **Prompt Library**: 17 curated agentic workflow prompts with support for repository path input
- **Transform Selection**: Code transformations from any app
- **Menu Bar Monitor**: Real-time Claude Code status and quick access
- **Usage Dashboard**: Cost and usage metrics tracking
