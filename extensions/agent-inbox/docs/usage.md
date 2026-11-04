# Usage

**English** | [简体中文](usage.zh-CN.md)

[README](../README.md) · [Setup and removal](setup.md)

## Commands

| Command                               | Purpose                                                                                       | Shortcuts                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Subscribe to Current Conversation** | Subscribe to the focused desktop conversation or terminal session                             | Assign a global hotkey in Raycast Preferences → Extensions                     |
| **All Sessions**                      | Browse all sessions, filter by subscription or status, and subscribe to the current window    | ↵ jump · ⌘↵ subscribe or unsubscribe · ⌘I details · ⌘R refresh                 |
| **Subscriptions**                     | Show subscribed, unhandled sessions in Waiting for You, Subscribed, and Completed sections    | ↵ jump · ⌘↵ unsubscribe · ⌘D mark handled · ⌘I details · ⌘⇧D archive completed |
| **Session Menu Bar**                  | Show subscriptions and the waiting count; control visibility in Raycast's command preferences | —                                                                              |

Subscription and status filters may overlap in **All Sessions**. The three **Subscriptions** sections are mutually exclusive. Running, turn-ended, and unknown sessions appear under **Subscribed**; a blue dot still indicates running. **Completed** contains only explicitly completed sessions.

Both session lists use **Return to jump** and **⌘Return to subscribe or unsubscribe**. Raycast's bottom bar shows Jump to Session; Actions (⌘K) shows both shortcuts. Subscribing leaves the list open. **Subscribe to Current Conversation** is a separate root command, available directly from Raycast search or a global hotkey. It also remains in All Sessions → Actions and on **⌘⇧Return**. **Connect an Agent** and **Open Extension Preferences** remain in Actions.

Rows prioritize the title, project, host, and activity. Open details with **⌘I** for the latest message and full status. Full-text search results retain matching snippets. Subscription section headings show their session counts; the detail sidebar hides redundant row labels to leave more room for titles.

Press **⌫ Delete** with an empty search field to return to the previous view; with text present it deletes text first. Escape follows Raycast's own settings. The connection panel uses native stack navigation.

### Search

Default search covers titles, projects, and session IDs. It does **not** automatically load or index full conversations. Choose **Set Up Full-Text Search** below the search results, or **Open Extension Preferences**, then enable **Full-Text Search**. The native preference explains what will be read and stored. Reopen **All Sessions** after changing it. Turning it off stops indexing and content queries; the existing index remains on disk and is no longer updated.

The index includes user and agent messages, with short Chinese terms, case normalization, and multiple keywords supported. Tool output, reasoning, and system-injected content are excluded. The initial build streams local files; subsequent refreshes reindex only changed file sizes or modification times. Queries use local SQLite and never upload conversations. Title search remains available while indexing. Leaving or refreshing the list cancels pending reads safely.

A local sample on 2026-11-04 contained 237 files and about 1.39 GB of records: the first index took about 4.38 seconds, occupied 17.9 MB, and peaked at roughly 308 MB process memory. A warm refresh took about 44 ms and queries about 3–9 ms, plus 180 ms input debounce. These are measurements on one machine, not guarantees. The index lives at `~/.sessions/cache/conversation-search.sqlite`. Cloud-only content without local records cannot be searched.

### Preferences and connections

The interface and notification labels use English. Open **Actions → Open Extension Preferences** to configure:

- **Default Terminal:** Terminal, iTerm2, or Ghostty. Navigation first targets the original window. If that fails, the selected terminal runs `claude --resume <id>` or `codex resume <id>`.
- **System Notifications:** Enabled by default. Only subscribed sessions with unhandled requests generate alerts. Handled, unsubscribed, answered, or disabled notifications are canceled before delivery. Reopen a command after changing the preference to synchronize the background collector.
- **Full-Text Search:** Disabled by default. Enabling it explicitly permits local conversation indexing; disabling it does not delete the index.

Enable or disable **Session Menu Bar** in Raycast's command preferences. Its refresh interval is one minute. There is no second visibility switch inside the extension.

**Connect an Agent** remains in the session action menus. It connects Claude Code or Codex and shows progress and success/failure. Existing configuration is backed up to `*.agent-inbox.bak`. Codex still requires its own `/hooks` approval. Custom adapters are implemented through the [integration interfaces](integrations.md).

### Upgrading from the earlier development version

Native preferences now control terminal recovery, notifications, and content search. Review them once after updating: notifications default to on and full-text search defaults to off. The old language and menu-bar fields in `config.json` are no longer used. Use **Connect an Agent → Reconnect** after upgrading to restart the collector with the updated CLI. If Raycast still lists an older development copy under the former author name, disable that copy so only the current extension manages shared preferences.

## State and subscriptions

- **Running:** The agent is executing. **Waiting for You:** A question, permission, failure, quota limit, or interruption needs attention.
- **Turn ended:** The current turn stopped and accepts further input. `Stop`, `agent-turn-complete`, and `end_turn` do not prove task completion.
- **Completed:** Requires an explicit `completed` event. Earlier Claude/Codex records inferred from stop events migrate to turn-ended while preserving subscription and handled state.
- **Status unknown:** The process exited during execution without reliable evidence of a normal end. Timeouts never imply completion.
- Structured questions and approvals persist by request ID. Stops, unrelated tools, and new turns do not clear them. Matching answers, cancellation, or closure events resolve only those requests. Codex desktop's asynchronous `accepted: true` means the question was issued, not answered; each question waits for its actual reply.
- Natural-language requests are fallback hints. They never prove task completion, and new user input clears those inferred hints.
- **Subscribe:** Follow a session and receive attention alerts. **Unsubscribe:** Stop collection and alerts; the conversation remains discoverable in All Sessions.
- **Mark as Handled (⌘D):** Hide the session until its state changes, a new request arrives, or it is resubscribed.
- Subscriptions refresh roughly every two seconds, All Sessions every five seconds, and the menu bar at Raycast's one-minute interval.

The user LaunchAgent `com.fango.agent-inbox.collector` reads only subscribed sessions. It first restores unanswered requests from bounded transcript chunks, without building a full-text index or replaying old notifications, then saves cursors for incremental collection. Each read is at most 1 MB; oversized lines are skipped. Missing, incomplete, or unsupported records cannot prove completion. Cloud-only sessions without local transcripts or hooks cannot be monitored reliably.

Temporary list-state recovery uses the same parsers and reducer but samples at most 96 KB from the tail. An incomplete sample cannot erase existing structured pending requests. The background collector performs full subscription recovery. Neither path modifies the agent's own files.

### Title synchronization

Titles sync by session ID independently of execution state. The collector updates subscribed sessions, and open lists refresh their titles at the intervals above.

- **Claude local desktop:** Current names from desktop session metadata.
- **Claude CLI:** Prefer neighboring `custom-title.json`; older transcripts incrementally supply `custom-title` and `ai-title`. Bounded recovery may take several refreshes. Generated names do not replace explicit custom names.
- **Codex CLI and desktop:** Current catalog names from compatible `state*.sqlite` tables or older `session_index.jsonl`.
- **Claude Cloud:** Passive reads of open Claude windows' outer document IDs and titles. No window activation, switching, or conversation traversal. Only exact ID matches update names. Unopened cloud-only sessions wait until the client displays them; unavailable sources preserve the last confirmed name.

New names persist separately. Older observations cannot overwrite newer ones. Renaming does not alter state, subscriptions, handled markers, or activity times, and does not trigger alerts. Queued alerts use the latest name at send time. Cloud title sync does not provide cloud execution monitoring.

### Subscribe to the current conversation

Invoke Raycast from the target agent window and run **Subscribe to Current Conversation**. You can assign it a global hotkey in **Raycast Preferences → Extensions**. The All Sessions action and **⌘⇧Return** shortcut invoke the same behavior. Raycast closes before foreground identification:

- **Claude/Codex desktop:** Prefer native Accessibility document URLs containing session IDs. Otherwise use a unique current-document title; fall back to System Events only if native reads fail. Claude title matching requires a Code page ending in `- Claude Code`. Ordinary chats, home pages, ambiguous titles, or missing window data never trigger a guess based on recent activity.
- **Terminal/iTerm2/Ghostty 1.4:** Match the selected tab or focused split by tty. tmux also matches the foreground client tty, server socket, and pane. Missing or ambiguous tty data produces an identification failure.

Codex preserves native window titles when Electron exposes a generic page title, accepts external thread links and local/detached/hash routes, and reads supported catalog schemas by capability rather than a fixed version. A confirmed window match corrects earlier CLI/desktop classification while retaining live hook state. Foreground capture briefly waits for focus restoration after Raycast closes.

Claude metadata maps `bridgeSessionIds` to `local_*` and CLI IDs, accepting older strings and newer arrays. Same-suffix `session_*` and `cse_*` IDs share the mapping; ambiguous mappings are rejected. Without local records, an explicit cloud Code session ID can still be subscribed to and reopened. A cloud icon identifies it in the lists and menu bar. The detail view explains that input reminders are unavailable. Unknown activity times are omitted from rows; subscription time is never used as activity.

CLI current-window matching requires installed hooks to collect tty/tmux locators. Historical transcripts usually lack these, so select those sessions manually.

Current-window subscription and return to the correct Codex desktop conversation were verified by the user; see the [test record](../TESTING.md) for the remaining coverage. When permissions or terminal interfaces are unavailable, use manual selection.

## Jump back

| Source         | Primary route                                                                                              | Recovery                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Claude desktop | Map the CLI transcript ID to the desktop `local_*` ID and open `claude://code/continue?session=<local_id>` | Open Claude and copy the ID for manual location     |
| Claude CLI     | Focus the tmux pane or a tty-matched Terminal/iTerm2 tab or Ghostty 1.4 split                              | Run `claude --resume <id>` in the selected terminal |
| Codex CLI      | The same terminal targeting                                                                                | Run `codex resume <id>` in a new terminal           |
| Codex desktop  | Open `codex://threads/<threadId>`, including `hostId` when available                                       | Open `codex://launch` and copy the ID               |

Claude desktop IDs differ from CLI transcript UUIDs; putting a CLI UUID directly into a desktop continue link is invalid. Navigation through a verified local mapping has been tested. Activating an app or copying an ID is recovery, not proof that the target conversation was reached. Older terminals without the required scripting interface may only support application activation.

A notification opens `raycast://…/inbox?context=…` and asks for confirmation (Return to jump, Escape to cancel). Return in Subscriptions jumps directly. Clickable notifications require `terminal-notifier`; without it, use the subscription list.
