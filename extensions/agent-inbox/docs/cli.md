# CLI

**English** | [简体中文](cli.zh-CN.md)

[README](../README.md) · [State and integration interfaces](integrations.md)

The bundled helper CLI handles hooks, background collection, and external events. It is not a separate npm package.

```sh
npm run build:cli
node assets/agent-inbox.mjs --help
```

Connecting an agent through **All Sessions → Actions → Connect an Agent** installs the stable path `~/.sessions/bin/agent-inbox.mjs`. Opening an extension command refreshes an installed CLI. Running `install` directly from a source bundle writes that source path into hooks; use the Raycast connection panel for normal setup.

## Commands

| Command                  | Arguments and defaults                             | Behavior                                                                                                                     |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `help` / `--help` / `-h` | None                                               | Print help without creating a database or log                                                                                |
| `list`                   | `--json`: boolean flag, off by default             | List up to 100 recent database sessions; does not scan all history                                                           |
| `jump <agent> <session>` | Two required strings                               | Return to a recorded session; exit nonzero if missing or navigation fails                                                    |
| `event`                  | See below                                          | Report a state event; may queue an alert for a subscribed session                                                            |
| `hook <claude\|codex>`   | JSON on stdin                                      | Ignore invalid/unsupported input; log errors and exit 0 to avoid interrupting the agent                                      |
| `hook codex-notify`      | Final argument is JSON; optional `--then <cmd...>` | Record Codex notify and forward to the existing notification program                                                         |
| `watch`                  | `--once`: boolean flag, off by default             | Collect subscribed sessions, sync titles, and deliver notifications; loop with about two seconds between passes, or run once |
| `deliver`                | None                                               | Deliver valid entries from the persistent queue                                                                              |
| `install <agent...>`     | Source IDs; `--collector` off by default           | Write hooks and optionally install/restart the macOS user collector                                                          |
| `version`                | None                                               | Print `agent-inbox 1`; 1 is the internal CLI protocol revision, not a release version                                        |

On SIGINT or SIGTERM, `watch` exits after its current pass. Collection failures are logged; a single-pass exit code does not replace checking the log. Failed deliveries use queued backoff retries.

Missing or unknown commands exit 2. Ordinary runtime errors exit 1. Hook mode logs errors and returns 0 to avoid disrupting the agent. Unknown options are currently ignored; callers should use only documented flags.

## Event options

| Option                  | Type / default                      | Meaning                                                                                                                                                    |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--agent`               | Required string                     | Source ID; reporting does not require a built-in adapter, but navigation does                                                                              |
| `--session`             | Required string                     | Session ID within the source                                                                                                                               |
| `--type`                | Required enum                       | `started`, `progress`, `tool`, `needs_input`, `resolved`, `stopped`, `completed`, `failed`, `quota`, `interrupted`, `ended`; missing/invalid values exit 2 |
| `--attention`           | Optional enum; unset                | `input`, `question`, `permission`, `failed`, `quota`, `interrupted`; invalid values exit 2                                                                 |
| `--title` / `--summary` | Optional strings; unset             | Current title and short summary; quote spaces in the shell                                                                                                 |
| `--cwd`                 | String; current directory           | Project path                                                                                                                                               |
| `--host`                | `cli` / `app`; unset                | Other values are treated as unspecified                                                                                                                    |
| `--event-id`            | Optional string; unset              | Stable ID for deduplication                                                                                                                                |
| `--turn`                | Optional string; unset              | Source turn ID                                                                                                                                             |
| `--request`             | Optional string; unset              | Comma-separated request IDs; use matching IDs for replies                                                                                                  |
| `--at`                  | Millisecond timestamp; `Date.now()` | Original occurrence time; nonnumeric values or zero currently fall back to now, so provide a valid positive number                                         |

Missing agent, session, or type exits 2. `stopped` means the turn ended; report `completed` only for explicit completion. Stops never erase unresolved requests. See the [state contract](integrations.md#state-contract).

## Isolated example

Run from the repository root. This example uses temporary state, disables notifications, and removes its demo data on exit:

```sh
npm run build:cli
(
  export AGENT_INBOX_HOME="$(mktemp -d)"
  trap 'rm -rf "$AGENT_INBOX_HOME"' EXIT
  printf '%s\n' '{"notifications":false}' > "$AGENT_INBOX_HOME/config.json"
  node assets/agent-inbox.mjs event --agent demo --session demo-1 \
    --type needs_input --attention question --title "Demo session" \
    --request question-1 --event-id question-1-open
  node assets/agent-inbox.mjs list --json | node -e '
    let text = "";
    process.stdin.on("data", chunk => text += chunk);
    process.stdin.on("end", () => {
      const [session] = JSON.parse(text);
      console.log(`${session.title}: ${session.status}`);
    });
  '
)
```

Output:

```text
Demo session: needs_input
```

## Environment variables

Paths are read at process startup. Use absolute directories. Missing or unreadable local sources do not provide access to cloud data.

| Variable                          | Default                                                     | Purpose                                                   |
| --------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `AGENT_INBOX_HOME`                | `~/.sessions`                                               | Configuration, database, logs, installed CLI, and caches  |
| `CLAUDE_CONFIG_DIR`               | `~/.claude`                                                 | Claude configuration and CLI sessions                     |
| `CODEX_HOME`                      | `~/.codex`                                                  | Codex configuration, sessions, and catalog                |
| `AGENT_INBOX_CLAUDE_DESKTOP_ROOT` | `~/Library/Application Support/Claude/claude-code-sessions` | Claude desktop metadata                                   |
| `AGENT_INBOX_SQLITE`              | Prefer `/usr/bin/sqlite3`, then Homebrew/PATH               | SQLite executable; an invalid path causes database errors |

Raycast native preferences own terminal recovery, notifications, and full-text search and are mirrored to `config.json` when a command opens. Raycast itself controls menu-bar visibility. Interface and notification labels are English. An unreadable config uses defaults; handwritten fields do not receive full schema validation, so prefer the interface. See [defaults](../README.md#data-and-preferences).
