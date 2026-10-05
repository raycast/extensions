# PromptCast Changelog

## [Fix] - {PR_MERGE_DATE}

- Add Raycast-verified node-pty native binaries so live sessions start.

## [Initial Release] - 2026-07-16

- Browse favorite chats, favorite projects, live sessions, and complete Claude Code and Codex CLI history.
- Control real interactive CLI sessions from a native Raycast terminal view.
- Share one live terminal between Raycast and supported terminals or editors through `tmux`.
- Reuse the existing Zed window, switch to the selected project without merging worktrees, and open shared sessions as Terminal Threads.
- Open shared sessions in Visual Studio Code, Cursor, and Windsurf integrated terminals.
- Configure permissions, model, reasoning effort, Fast mode, and advanced provider settings before every idle session starts.
- Open live sessions directly, and save complete next-start settings from Extras without restarting the active CLI.
- Configure Codex personality, answer verbosity, and reasoning summaries, plus Claude output style and transcript view.
- Start new conversations with safeguarded permission profiles while keeping unrestricted modes opt-in and mapping YOLO to Codex's stable dangerous-bypass flag.
- View Claude and Codex limits in Raycast and the macOS menu bar.
- Show Claude, Codex, or both providers together in the menu bar with original provider logos, configurable short-term or weekly windows, percentage mode, and a compact reset display without clock or divider glyphs.
- Keep multi-gigabyte local history collections within Raycast's command heap by using bounded JSONL reads, an LRU transcript cache, and a compact live terminal buffer.
- Open favorite and live sessions directly from the menu-bar command.
- Manage MCP servers and local skills.
- Customize, disable, and restore every PromptCast-defined keyboard shortcut from the in-context settings screen.
- Send Escape directly to a live CLI with `⌘⇧Esc` by default.
- Prepare the manifest, assets, documentation, and native binary provenance for Raycast Store review.
