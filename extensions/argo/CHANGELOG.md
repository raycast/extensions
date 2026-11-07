# Argo Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Replace native message metadata panels with compact status icons and hover details. Keep failure and uncertainty labels visible, with exact timestamps and diagnostics available in Message Details. Preserve blank-separated nested Markdown lists instead of rendering them as standalone code.

- Render conversation replies as safe Markdown with tables and unchanged code blocks, while keeping original terminal and approval screens literal. Document optional personal command hotkeys.

- Preserve repeated answer endings during Herdr extraction and merge per-turn history writes across terminal views so returning to an earlier view cannot erase newer messages.

- Add local Herdr conversation rows for explicit Raycast messages and conservatively isolated per-turn output, with bounded history, streaming replacement and honest raw-screen fallbacks. Keep approvals tied to original-screen review and preserve no-replay delivery safeguards.

- Simplify Herdr output to content only, move routine diagnostics into inspection, and add live full-width reading with Command-Shift-F while retaining exceptional warnings and reviewed terminal controls.

- Confirm ordinary Herdr messages with a transient toast instead of a persistent banner above terminal output; retain error and uncertain-input warnings.

- Fix repeated Herdr messages after completed answers, recognize done as Ready, and honor HC's actual conditional-send schema.
- Align Herdr Send Message and Compose Message with existing Enter and Command-N workflows; keep working drafts without routing them into permission controls.
- Open the complete source list from Agent Sessions while preserving Recent Agent Session resume behavior.
- Keep confirmed pre-write status rejections retryable without a false uncertain-input lock; preserve unknown delivery safeguards.

- Add direct Herdr core support alongside existing Argo bridges, with source filtering and exact recent targets.
- View live terminal output, compose tasks, send explicit dialog keys, review text responses and interrupt inside Raycast.
- Preserve independent drafts and uncertain input markers without automatic replay or approval-completion claims.
- Keep first-run source selection visible instead of forcing bridge onboarding.
- Add a Raycast companion UI for separately installed, self-hosted Argo bridges.
- Add server setup prompts, bounded signed loopback discovery, and mandatory one-time Mac pairing.
- Browse sessions across paired servers, reopen recent conversations, and send messages with local drafts.
- Review supported approval requests with Enter to allow or Command-Shift-D to deny, without a second confirmation dialog.
- Document Claude cooperative-pull limits, experimental Codex shared-runtime requirements, and private credential and data storage.
