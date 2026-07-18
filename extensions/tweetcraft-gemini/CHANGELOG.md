# Changelog

## [Improve Local Draft Reliability] - {PR_MERGE_DATE}

- Prevent overlapping Raycast commands from overwriting unrelated drafts.
- Migrate existing local history to a per-record storage format automatically.
- Add automated coverage for retention, deduplication, retry recovery, malformed data, and proxy credential redaction.
- Use US English throughout the Store-facing interface.
- Make proxy configuration optional and remove the machine-specific default.
- Add clear public documentation for local storage and Gemini data handling.

## [Protect Local Drafts] - 2026-07-18

- Save the Chinese source locally before starting any Gemini request.
- Copy the original Chinese text automatically when rewriting fails.
- Add Recent TweetCraft Drafts for recovery, copying, retrying, and deletion.
- Keep up to 50 records and remove records after 30 days without updates.
- Deduplicate identical text submitted with the same mode within five minutes.
- Record safe failure categories and update the original record after a retry.

## [Initial Release] - 2026-07-18

- Add Natural, Punchy, Short, and Reply rewriting commands.
- Add automatic clipboard copy and Raycast HUD feedback.
- Add Gemini model, network mode, and explicit proxy preferences.
