# Architecture

**English** | [简体中文](architecture.zh-CN.md)

[README](../README.md) · [CLI](cli.md)

```text
Source plugins (hooks / transcripts / custom events)
                        ↓
            EventEngine → State machine → SQLite
                                            ├─ Raycast lists / menu bar
                                            └─ Persistent outbox → Notification channels
                                                                       └─ macOS
```

- **Sources:** `src/core/adapters/` defines detection, setup, parsing, and navigation. Optional `source` capabilities include transcript parsing, history discovery, location, and titles. `src/core/sources/` manages bounded reads and persistent cursors, reporting events through `EventEngine`.
- **Claude Code:** Observes session start, user input, tool activity, permissions, tool failures, notifications, turn stops, `StopFailure`, and session exit. It never approves requests.
- **Codex CLI and desktop:** Structured hooks complement local rollouts. Existing notify commands retain `--then` forwarding. Parsers support synchronous and asynchronous questions, actual answers, turn starts, stops, and interruptions. Hook installation was verified against local CLI 0.163.0 capabilities; Codex manages its own hook trust.
- **Custom sources:** JSON manifests describe navigation only. Sources report through CLI `event` or `EventEngine.ingest`. A DeepSeek Harness bridge would need turn, approval, question, and answer events. Discovery, search, and foreground recognition need separate implementations.
- **Core:** Events carry source, event, turn, and request identities. SQLite revision checks and retries prevent concurrent hooks from losing updates. State, deduplication receipts, and notification entries commit in one transaction. Subscription and handled-state edits also use revision checks.
- **Notifications:** `src/core/notifications/` defines channel-independent messages and `NotificationChannel.send`. macOS is the only built-in channel; it owns Raycast navigation links. Network channels can be added without changing parsers or the state machine. The queue uses leases, timeouts, backoff, and stable message IDs. Crash recovery provides at-least-once delivery, so network channels should deduplicate IDs.
- **Background service:** A standalone CLI collects subscribed sessions and delivers notifications roughly every two seconds. Hooks write state and queue entries, then start a separate delivery process. Network delivery does not block the hook.
- **Preferences:** Raycast's native preferences control notifications, the recovery terminal, and opt-in full-text search. Commands mirror them to the CLI configuration. Raycast controls menu-bar command visibility. Interface and notification labels use English.
- **Data:** State and the queue live in `~/.sessions/db.sqlite`; hook errors go to `~/.sessions/log.txt`. History caches and the optional full-text index live in `~/.sessions/cache`.

See [integration interfaces](integrations.md) for contracts and examples.
