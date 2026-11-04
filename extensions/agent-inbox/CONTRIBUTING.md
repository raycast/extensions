# Contributing

**English** | [简体中文](CONTRIBUTING.zh-CN.md)

Agent Inbox focuses on discovering, subscribing to, monitoring, and returning to existing agent sessions. For a new source or notification channel, open an issue describing the use case and available data before implementing the interface. See the [compatibility limits](README.md#compatibility).

## Development environment

Use macOS, Raycast, Node.js 22.22.2 or later, and the system `sqlite3`. With nvm, run `nvm install` first; this repository selects Node 24.

```sh
npm ci
npm run check
npm run dev
```

`npm run check` runs tests, TypeScript, ESLint, Prettier, and CLI/Raycast builds. `npm run dev` loads the extension into Raycast for interface checks. Connecting an agent is a separate action that edits hook configuration and installs a background collector; see [setup](docs/setup.md).

Tests use temporary databases and configuration. They do not install real hooks or send messages to agents. Real windows, notification clicks, permissions, and terminal navigation still need manual checks. Record automated and live results separately.

## Changes and verification

- Follow the existing TypeScript, ESLint, and Prettier configuration. Avoid unrelated formatting changes.
- For state or navigation changes, include a reproducible input and a regression test. Use fictional session IDs, paths, and conversation content.
- Never guess the target session from recent activity or infer task completion from a timeout or an ordinary turn ending.
- Update the [usage guide](docs/usage.md) and [changelog](CHANGELOG.md) when behavior changes.
- English is the default documentation language. Keep corresponding `.zh-CN.md` editions and their language links in sync when changing features, setup, or compatibility. The extension interface uses English.
- `assets/agent-inbox.mjs` is a tracked generated file. Run `npm run build:cli` after changing core or CLI code; do not edit the bundle by hand.
- See [integration interfaces](docs/integrations.md) for sources, state contracts, and notification channels.

## Reporting a problem

Use [Issues](https://github.com/raycast/extensions/issues) for questions, bugs, and feature requests. Include:

1. The commit or release, macOS, Raycast, and agent client versions.
2. The source: Claude or Codex; CLI, desktop, or cloud-only; terminal or tmux environment.
3. Minimal reproduction steps, expected behavior, and actual behavior.
4. Only the redacted screenshots or log excerpts needed to reproduce the issue. Do not attach entire transcripts, databases, configuration, or credentials.

For vulnerabilities, follow the [security policy](SECURITY.md).

## Pull requests

Describe the concrete problem, resulting behavior, checks performed, and untested scenarios. Keep the scope focused and link the related issue. Enable “Allow edits from maintainers” when possible.

Run `npm run lint` before submitting to validate the Raycast manifest, icon, and author account. It needs network access and complements the local code checks.
