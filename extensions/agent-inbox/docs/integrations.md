# Source and Notification Interfaces

**English** | [简体中文](integrations.zh-CN.md)

## State contract

`Session.status` is `running`, `needs_input`, `ready`, `done`, `idle`, or `unknown`. Execution phase lives in `Session.state.phase`; unresolved requests live in `pending`. Any pending request makes the displayed state `needs_input`, even if execution is already `ready`.

- `progress`: Starts or resumes work, clearing text-inferred hints while preserving structured requests with IDs.
- `needs_input`: Adds the question or approval identified by `requestIds`; `attention` describes why. Without an ID, it is a fallback hint cleared by new user input.
- `resolved`: Answers, cancels, or closes the matching request ID without clearing others.
- `tool`: Tool activity; clears a request only with its matching ID.
- `stopped`: Ends the turn and enters `ready`. It does not assert completion or clear pending requests.
- `completed`: An explicit guarantee from the source that the task is complete; pending requests still take precedence.
- `failed`, `quota`, `interrupted`: Need user attention.
- `ended`: Process exit; running becomes unknown, retaining pending requests.
- `snapshot`: Internal recovery event, unavailable through the CLI.

Sources should supply stable `eventId`, `turnId`, and original occurrence time `at` in milliseconds. Request IDs must be unique within a session. The core rejects older phase changes but accepts identified late questions and replies to reconcile hooks and logs. Answered IDs prevent reopening. Never substitute processing time for an historical event's time.

## Adding a source, such as DeepSeek Harness

Implement `detect`, `planInstall`, `planUninstall`, `parseHook`, and `jump` on `Adapter` in `src/core/adapters/types.ts`, then add it to the registry. Optional `source` capabilities are:

- `transcript.parse(entry, session, context)`: Convert one source record to zero or more `AgentEvent` values.
- `locateTranscript(session)`: Locate the exact local record; never guess the newest file.
- `discover()`: Reserved history-discovery interface. The current list still uses Claude/Codex-specific scans; wire a new source's results into that list.
- `titles(sessions)`: Return `SessionTitle[]` identified by agent/session ID with title, source, and `observedAt` captured when the read began. These are independent metadata, not state events. Missing, failed, or empty reads must not erase a confirmed title.

`TitleSynchronizer` merges sources into the separate `session_titles` table for existing sessions, then supplies committed names to the UI. Equal or older observations cannot replace saved values. It does not change activity, state, subscription, handled markers, event receipts, or notification entries. History-only sessions update on screen without being imported or subscribed. Batched writes bound SQLite query depth, and each source is isolated to its own agent. Delivery fetches the latest title.

Sources do not import notification implementations. Collection uses `new TranscriptCollector(engine, () => adapters)`; hooks and custom bridges share `EventEngine.ingest`. A push-based host can send events without transcripts:

```sh
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session session-1 \
  --type needs_input --attention permission --request approval-7 \
  --turn turn-3 --event-id approval-7-open --at 1793772000000
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session session-1 \
  --type resolved --request approval-7 --event-id approval-7-closed --at 1793772010000
```

JSON manifests describe jump URLs or recovery commands only. They do not execute arbitrary plugin code or collect state automatically. No DeepSeek Harness bridge is built in.

## Adding a notification channel, such as Feishu

Implement `NotificationChannel` from `src/core/notifications/types.ts`:

```ts
const channel: NotificationChannel = {
  id: "feishu",
  async send(message, { config, signal }) {
    // Use message.id for idempotency; respect signal and throw on failure.
    // Messages contain agent/sessionId, title, summary, attention, and time.
  },
};
await deliverNotifications(store, config, [macosChannel(), channel]);
```

Register it in the CLI delivery composition and enable its ID in `notificationChannels`. The default is `["macos"]`; `notifications: false` disables all channels. An unregistered channel cannot deliver and remains queued for backoff retries.

`EventEngine` queues enabled channels without making network calls. State, deduplication, and queue entries commit atomically. The separate delivery worker rechecks subscriptions, handled state, unresolved requests, and global notification preferences before sending. Each attempt has a ten-second limit; failures retry with exponential backoff up to one hour.

Delivery is at least once, not exactly once across arbitrary external services. Deduplicate by stable `message.id` when supported. Credentials belong to channel configuration, never `AgentEvent` or message content. Feishu network delivery is not implemented.

## Running and validating

**Connect an Agent** installs or restarts the user LaunchAgent `com.fango.agent-inbox.collector`. It reads only subscribed local sessions, first restoring bounded history without sending old notifications, then reading incrementally. Multi-megabyte tool output is skipped with bounded memory; incomplete JSON waits for the next read. Original agent files remain read-only.

`watch --once` runs one collection/delivery pass. For debugging, use a temporary `AGENT_INBOX_HOME` and `notifications: false` to avoid changing real subscriptions or sending alerts. Stop the service with `launchctl bootout gui/$(id -u)/com.fango.agent-inbox.collector`; retaining its plist permits it to restart at login or reconnection.

Current adapters were validated against local Codex CLI 0.163.0 hook capabilities, actual local log formats, and Claude Code records. Tests cover synchronous/asynchronous questions, partial answers, duplicates, ordering, concurrency, migration, partial writes, rotation, large-file recovery, and retries. Cloud-only data, changed client protocols, and native notification clicks need live validation for the corresponding client version.
