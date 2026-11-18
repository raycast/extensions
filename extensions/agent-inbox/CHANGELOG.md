# Agent Inbox Changelog

**English** | [简体中文](CHANGELOG.zh-CN.md)

## [Initial Release] - 2026-11-05

- Find Claude Code and Codex sessions by title, project, or session ID, including past conversations.
- Subscribe to the focused conversation from Raycast search or a global hotkey, or choose a session in All Sessions.
- Follow subscribed sessions in a searchable list and the menu bar, with notifications for questions, approvals, and other requests that need attention.
- Press Return to jump to a desktop conversation, terminal tab, or tmux pane; use Command-Return to toggle subscriptions and Command-D to mark a request handled.
- Identify Claude cloud conversations with a cloud icon and navigate to them without implying local status monitoring.
- Search local user and agent messages with optional full-text indexing, disabled by default.
- Configure terminal, notification, and search preferences through Raycast, with icons for light and dark themes and documentation in English and Simplified Chinese.
- Keep terminal navigation tied to the live agent process, preserve new-request alerts during history recovery, and let full-text indexing continue across list refreshes.
- Report configuration and subscription failures from both current-conversation entry points; use Raycast's SQL helper for Codex catalog reads while keeping the standalone CLI independent.
