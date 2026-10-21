# BoltAI for Raycast

Use [BoltAI](https://boltai.com) from Raycast with your own providers, models, AI Workflows and prompts.

- **Ask BoltAI**: a one-off answer from your default model. ⌘O asks again in a BoltAI chat.
- **Run AI Workflow**: run an AI Workflow or Multi-step Workflow on the selected text (↵), the clipboard (⌘⇧V) or typed input (⌘T), then paste or copy the result. ⌘E opens the workflow in BoltAI.
- **New Chat**: open a new chat in BoltAI, sending the message you type.
- **Search Prompts**: paste or copy a saved prompt.

## Requirements

BoltAI 3.0 or later, which includes the `bolt` command-line tool. The extension finds it in `~/.local/bin/bolt` (installed from BoltAI › Settings › General › Command Line) or inside any `BoltAI*.app` in `/Applications`, `~/Applications` or `/Applications/Setapp`. If BoltAI is somewhere else, set **bolt Path** in the extension's preferences.

BoltAI does all the work: the extension runs `bolt`, which talks to the BoltAI app and opens it in the background when it isn't running. The extension never reads API keys or your chats. Leaving a running command cancels the request in BoltAI.

## Development

```bash
npm install
npm run dev
```

Testing against the UI-test fixture instance (no real provider requests): launch the Debug app in fixture mode as described in the repository's `AGENTS.md` (`bolt` command-line tool section), then point **bolt Path** at a script that sets `BOLTAI_CLI_INSTANCE=<name>` and runs `exec …/BoltAI.app/Contents/Helpers/bolt "$@"`.
