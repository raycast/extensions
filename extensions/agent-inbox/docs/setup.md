# Setup and Removal

**English** | [简体中文](setup.zh-CN.md)

[README](../README.md)

## Requirements

- macOS and Raycast, plus an existing Claude Code or Codex setup. Agent Inbox does not install or sign in to those clients.
- The system `sqlite3` for local state and search indexes.
- Optional `terminal-notifier` for clickable notifications.

Hooks and the background collector use an existing Node.js installation when available, with Raycast's runtime as a fallback. Source development requires Node.js **22.22.2 or later**, npm, and Git; `.nvmrc` selects Node 24.

## Install in Raycast

Agent Inbox is not yet published in the Store. Once approved, open Raycast's **Store** command, search for **Agent Inbox**, and install it. Then connect an agent below. Store installation does not require cloning a repository or running npm. Until then, use a source checkout as described below.

## Install from source

Clone the project and install its development dependencies:

```sh
git clone https://github.com/0xFANGO/agent-inbox.git
cd agent-inbox
npm ci
npm run dev
```

To review a change in the Raycast extensions repository, run the npm commands from `extensions/agent-inbox` on the PR branch instead.

`npm run dev` builds the helper CLI and imports the extension into Raycast. For release validation, stop the development process, run `npm run build`, and exercise the commands in Raycast. Search for **Agent Inbox** to find all four commands, including **Subscribe to Current Conversation**. A command can have its own hotkey in **Raycast Preferences → Extensions**.

### Connect your first agent

1. Open **All Sessions**, then its action menu (⌘K), and choose **Connect an Agent**.
2. Select Claude Code or Codex and press Return. The panel reports progress and the result.
3. For Codex, approve new hooks with `/hooks` inside Codex. Whether an existing session loads new hooks depends on the client; verify with a new session if needed.
4. In **All Sessions**, select a conversation and press ⌘Return to subscribe. To follow the focused conversation, invoke Raycast from the agent window and run **Subscribe to Current Conversation** directly. All Sessions also keeps **Actions → Subscribe to Current Conversation** (⌘⇧Return).
5. Open **Subscriptions**. Monitored sessions enter **Waiting for You** when an answer or permission is needed. With notifications enabled, new requests trigger an alert. Press Return to jump back.

Start by subscribing to an existing session to check the list. Test alerts with a new question or permission request: recovering historical state does not send old notifications.

### Permissions and clickable notifications

Window recognition and terminal targeting need macOS Accessibility or Automation permissions. Follow the system prompt in **System Settings → Privacy & Security** for the Raycast or terminal process performing the action. If window information is unavailable, select the session manually in **All Sessions**.

For clickable notifications, install with Homebrew:

```sh
brew install terminal-notifier
```

Without it, system notifications still display but cannot navigate back. Clicking a notification opens a confirmation in Raycast before jumping; Return within **Subscriptions** jumps directly. macOS notification permissions and Focus settings also affect delivery.

## What setup changes

| Location                                                       | Purpose                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `~/.claude/settings.json`                                      | Claude hooks; follows `CLAUDE_CONFIG_DIR` when set                  |
| `~/.codex/config.toml`, `~/.codex/hooks.json`                  | Codex notify forwarding and hooks; follows `CODEX_HOME`             |
| `~/.sessions/bin/agent-inbox.mjs`                              | Stable CLI path used by hooks and the collector                     |
| `~/Library/LaunchAgents/com.fango.agent-inbox.collector.plist` | User background collector                                           |
| `~/.sessions/`                                                 | State, subscriptions, configuration, notification queue, and caches |

Setup preserves unrelated hooks and existing Codex notify forwarding. Before changing an existing configuration file, it writes a sibling `*.agent-inbox.bak`. This backup stores the previous contents and may be replaced by later setup changes. Connecting also installs or restarts the collector. After an extension update, opening a command refreshes an already-installed CLI.

Agent conversation files remain read-only. Search uses titles, projects, and IDs by default. Enable **Full-Text Search** in native extension preferences to index conversation content locally. Disabling it leaves the existing index on disk. See [search](usage.md#search).

## Disable or remove

Unsubscribe to stop monitoring and alerts for a session. To stop all alerts, turn off **System Notifications** in Raycast's extension preferences, then reopen a command to sync the collector configuration.

To remove the extension:

1. Open **All Sessions → Actions → Connect an Agent**. For each connected agent, choose **Remove Hooks** from its actions. This removes only this extension's entries; do not restore an old backup over the entire client configuration.
2. Stop the collector and remove its login item:

   ```sh
   launchctl bootout "gui/$(id -u)/com.fango.agent-inbox.collector"
   rm -f "$HOME/Library/LaunchAgents/com.fango.agent-inbox.collector.plist"
   ```

   If already stopped, the first command may report that the service is missing. Still remove the plist to prevent a later login from starting it. Removing hooks alone does not uninstall the collector.

3. Remove Agent Inbox in Raycast's extension preferences.
4. Optionally delete `~/.sessions/`, losing subscriptions, configuration, and the local index. Check the corresponding directory if you use `AGENT_INBOX_HOME`. This is separate from the original Claude and Codex conversation storage.

## Troubleshooting

| Symptom                            | Check                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Current-window subscription fails  | Use a supported Code page and check window/tty permissions; select the session manually if needed                            |
| A cloud-only session has no alerts | Without local records or hooks, monitoring is unavailable; its status says “Cloud status unavailable”                        |
| A session is not marked completed  | An ordinary stop means “Turn ended”; only an explicit completion event produces “Completed”                                  |
| No system notification             | Check subscription, handled status, notification preferences, and macOS permissions; history recovery does not replay alerts |
| Notification cannot be clicked     | Install `terminal-notifier`, or jump from Subscriptions                                                                      |
| Navigation only opens the app      | Exact targeting was unavailable; the UI reports ID-copy or CLI-resume recovery                                               |

Diagnostic logs are `~/.sessions/log.txt` and `~/.sessions/collector.log`. Redact paths, conversation content, and credentials before [reporting an issue](../CONTRIBUTING.md).
