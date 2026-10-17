# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Put separate model/effort pickers and New Chat directly below message entry and inside the composer; open the supported effort list with Enter and focus the current level.
- Require first-run local CLI connection/auth-state checks and an explicit default model/effort choice before opening chat.
- Use an English interface following repository guidelines; preserve earlier completed setup and conversation records.
- Allow setup to be reopened from Actions; recheck after connection preference changes without deleting history.
- Preserve newer composer input when an earlier send acknowledgement completes.
- Show active search/tool/command and stopped/failed states while keeping healthy idle chat uncluttered.
- Name the extension Codex in Raycast and focus on resident CLI chat using native Raycast controls.
- Stream Markdown and LaTeX with speaker avatars and newest-first replies.
- Use a full-width native reader and floating message composer, removing the chat sidebar and placeholder row entirely.
- Continue the same conversation through Enter-to-compose/send and in-progress steering; preserve closed-menu drafts without accidental sends.
- Remember supported model/effort choices, preserve drafts, and offer native copy/new/stop actions.
- Preserve unsent drafts when a missing server conversation must be replaced.
- Match streamed/completed messages to persisted server item IDs when resuming, avoiding duplicate replies.
- Keep a short recent-chat switcher; remove global CLI browsing, rename and archive/restore management controls.
- Remove the independent-window feature, preference, and handoff code.
- Discover installed Codex on macOS and Windows and keep existing local authentication and data.
