# PromptCast Changelog

## [Add quota monitoring] - {PR_MERGE_DATE}

- Add visual gauges to the existing usage viewer.
- Connect Claude Code's status line to read saved quota observations while preserving the existing status line.
- Add quota-only monitoring without Claude usage subprocesses or chat-history discovery.
- Support local JSON quota snapshots for other providers in the viewer and menu bar.
- Keep Claude's last observed limits in the quota-only menu bar until reset, marked with `~` after five minutes.
- Exclude failed and expired readings from menu-bar percentages; other providers still require fresh observations.
- Preserve the original Claude status line when Raycast's runtime or the wrapper is missing, and offer reconnection after runtime updates.
- Keep valid weekly limits visible when a shorter window expires.
- Reject observations from prior Claude connections and bound the usage cache to one entry.
- Show Codex's normal subscription windows and tolerate unavailable optional token statistics.
- Honor configured CLI data folders when querying usage.
- Update the Raycast SDK and vulnerable transitive dependencies.

## [Fix] - 2026-07-17

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
