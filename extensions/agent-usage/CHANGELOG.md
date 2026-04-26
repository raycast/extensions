# Agent Usage Changelog

## [Add Copilot Usage Provider] - 2026-04-14

- Add Copilot usage provider with GitHub Copilot internal API support
- Auto-detect Copilot token from `GH_TOKEN` / `GITHUB_TOKEN` with preference fallback
- Add Copilot visibility preference and list/menu bar entries

## [Add Windows Support] - 2026-04-12

- Add Windows support

## [Support Droid Encrypted Auth v2] - 2026-04-12

### Improvements

- Support Factory Droid's new encrypted auth v2 format with backward compatibility for legacy auth files
## [Synthetic Provider and OpenCode Integration] - 2026-04-09

### New Features

- **Multi-Account Support** — Add 2nd API key slot for Kimi and z.ai providers (fallback to secondary key if primary fails)
- Add Synthetic (synthetic.new) provider — monitor subscription quota, search hourly quota, and free tool calls
- Auto-detect Kimi, Synthetic, and z.ai credentials from OpenCode (`~/.local/share/opencode/auth.json`)
- **Named Multi-Account Support** — All API key providers (Codex, Kimi, Synthetic, z.ai) now support unlimited named accounts ("Work", "Personal", etc.) managed via a "Manage Accounts" screen accessible from the action panel (Cmd+M). Each account appears as its own row in the list.
- **Auto-detected accounts** — OpenCode, environment variable, and local auth file tokens now appear as separate "Auto-detected" accounts alongside manually added accounts
- **Quick API Key Copy** — Copy API key to clipboard with `⌘⇧C` from the provider list or Manage Accounts screen
- **OpenCode Active Indicator** — Shows a ⚡ bolt icon next to accounts whose API key is currently configured in OpenCode (auto-detected from `~/.local/share/opencode/auth.json`)

### Improvements

- **Kimi Accessory Normalization** — List view now shows `72%` instead of `72% remaining` to match other providers
- Move Antigravity provider below Gemini in default agent order
- Update Kimi API endpoint to new flat shape (`GET /coding/v1/usages`)
- Unify detail field names and progress bar style across all agents
- Extract shared utilities (`decodeJwtPayload`, `getRemainingPercent`, `formatDuration`, `cleanString`) to eliminate code duplication
- Deduplicate replenish-time calculation in Amp renderer
- Simplify token resolution in Kimi fetcher
- Document magic strings in Droid auth (WorkOS client ID, token refresh buffer)
- Name Claude OAuth beta header as constant with update instructions

### Bug Fixes

- **Critical:** Fix z.ai percentage calculation — API's `percentage` field is "percentage used" not "percentage remaining", so remaining = 100 - percentage
- **Critical:** Fix menubar to use multi-account hooks so all configured accounts are shown
- **Critical:** Fix menubar infinite re-render loop by memoizing `visibleAgents`
- Remove meaningless conditional in `handleRefresh` (both branches were identical)
- Hide antigravity model slots that have no data (prevents orphaned separators)
- Improve Amp parser not-logged-in detection with explicit signals
- Fix Amp revalidate race condition by using counter instead of boolean flag
- Remove conflicting `Cmd+C` keyboard shortcut from Copy API Key actions
- Remove dead `renderUnsupportedDetail` function
- Merge split kimi/fetcher import statements
- Fix z.ai preference label spacing

## [Settings Shortcut] - 2026-04-04

### Improvements

- Add a default keyboard shortcut for `Open … Settings` actions using Raycast’s `Keyboard.Shortcut.Common.Open`

## [Progress Bars & Zero-Config Auth] - 2026-03-16

### New Features

- Add ASCII progress bar visualization for all agent usage details
- Auto-detect Droid auth token from `~/.factory/auth.*` (zero config)
- Auto-detect Codex auth token from `~/.codex/auth.json` (zero config)
- Auto-detect z.ai API key from shell environment variables (`ZAI_API_KEY` / `GLM_API_KEY`)
- Auto-refresh usage data on menu bar click

### Improvements

- Unify detail field names and progress bar style across all agents
- Simplify Amp detail view (remove email and nickname)
- Simplify Gemini detail view (remove email and tier fields)
- Shorten Amp bonus duration format to "d" suffix

### Bug Fixes

- Fix z.ai env token lookup to be async and robust
- Harden Droid and Codex auth refresh and hook state

## [Add Claude Usage Provider] - 2026-03-09

- Add Claude usage provider powered by Claude CLI OAuth credentials
- Fetch Claude usage from Anthropic OAuth usage endpoint (5h, weekly, model-specific, extra usage)
- Add Claude visibility preference and provider entry in Agent Usage

## [Menu Bar is Coming and Fix some bugs] - 2026-02-24

### New Features

- Add agent usage menu bar command with quick overview
- Navigate to agent detail view on click from menu bar
- Add Configure Command action in menu bar
- Add progress pie icon to list item accessories

### Improvements

- Extract shared http, hooks, format, and UI utilities for better maintainability
- Skip hidden providers execution for better performance
- Rename z.ai label to z.ai(GLM) for clarity
- Update settings URLs for Codex and Droid

### Bug Fixes

- Fix z.ai showing remaining percentage instead of used percentage

## [Initial Version] - 2026-02-20

- Track usage for Amp, Codex, Droid, Gemini CLI, Kimi, Antigravity, and z.ai
- View remaining quotas and detailed usage breakdown
- Refresh data and copy usage details to clipboard
- Customize visible agents and display order
- Amp display mode: amount or percentage
