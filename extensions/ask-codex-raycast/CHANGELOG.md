# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Add ten bundled interface languages with Gemini-assisted translations.
- Require first-run language selection, local CLI connection/auth-state check, and an explicit default model/effort choice before opening chat.
- Allow setup to be reopened from Actions; recheck after connection preference changes without deleting history.
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
