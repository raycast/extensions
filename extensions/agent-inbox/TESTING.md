# Test Record

**English** | [简体中文](TESTING.zh-CN.md)

Release preparation checked on 2026-11-04 (Asia/Shanghai). Automated checks, native UI checks, and user-reported checks are listed separately.

## Automated verification

- `npm run check`: **152 tests passed**, no failures or skips, plus TypeScript, ESLint, Prettier, helper CLI bundling, and the Raycast distribution build (`ray build -e dist`).
- The regression suite covers foreground identity, terminal/tmux locators, Claude/Codex hook parsing, request lifecycle, concurrent database writes, notification cancellation/retries, local history, title synchronization, and optional full-text search.
- Added regressions for Claude's generic permission reminder following an `AskUserQuestion` request, including reversed arrival order, matching answers, and independent approvals/quota errors. The reminder must not create a second pending request or survive the answered question.
- Navigation unit tests use injected interfaces. They do not prove that a real window opened.

## Native and user verification

- Loaded all four commands in Raycast. **Subscribe to Current Conversation** appears in root search, separately from All Sessions, Subscriptions, and Session Menu Bar; it can have its own global hotkey.
- The user verified that the independent command subscribes to the current **Codex desktop** conversation and Return in Subscriptions returns to the correct conversation.
- The user also verified current-conversation subscription and return to the original tab in their usual terminal. The terminal application was not identified, so this is not a claim that every supported terminal was tested.
- Inspected the current distribution build in native Raycast: Claude cloud rows show a cloud icon without the long unavailable-status label or an unknown-time dash. Details retain the monitoring limitation. Previous list checks covered light/dark themes and Return / Command-Return ordering.
- Started a real Claude Code CLI smoke session in a temporary directory with the existing Agent Inbox hook definitions and only the question tool available. Its start, turn end, structured question, and answer pass through the real hook CLI and local database. Subscribed to it through Raycast with Command-Return and observed it in Waiting for You.
- Repeated the question after the lifecycle fix: the structured question and generic reminder produced exactly one pending request. Answering it returned the session to `ready` with no pending requests. Verified Command-D marks the test session handled and removes it from Subscriptions; a later status change clears that handled state.
- Verified Subscriptions search returns only the matching test session. Explicitly enabled native filtering, which Raycast otherwise disables when a search callback is present. Unsubscribed and removed the temporary session after verification.

## Remaining live coverage

- **System notification delivery and clicking the notification remain unverified.** Homebrew `terminal-notifier` 3.1.0 is installed, but `terminal-notifier -diagnose` reports notification authorization denied. The user chose to leave that permission off for now. The notification queue retries; no successful delivery or click is claimed.
- Terminal, iTerm2, Ghostty, and tmux each still need a separately identified original-tab/pane test. The automation tool prohibits operating Terminal and Ghostty windows; the user's usual-terminal check above is the available live evidence.
- A complete system-notification → click → target-window → handled-state → visible menu-bar-count run is therefore still pending.

## Store material

Three screenshots use fictional sessions, a consistent dark theme and background, and 2000 × 1250 PNG files. They are native window captures framed on a uniform background; Raycast Capture Window did not export on this installation.

The submission is prepared directly under `extensions/agent-inbox` in a Raycast extensions checkout. Only extension source, tests, runtime assets, screenshots, and supporting documentation are included; local development skills, internal investigation notes, dependencies, and generated validation files are excluded from the commit. Repository and support links target the public upstream repository, and the submission follows its security-reporting policy.

The prepared source passed a fresh `npm ci`, `npm run check`, and `npm run lint`. The installable bundle was also verified with `npm run bundle`. Local documentation/media links, four bundled commands, the helper CLI, and the license were checked. Store publication has not taken place.
