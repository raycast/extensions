# Rlog Changelog

## [Capture + Sync] - {PR_MERGE_DATE}

- **Capture Read**: Capture an article (URL, thoughts, rating) to a local JSONL inbox with no git, blog path, or credentials required — for use on a secondary machine.
- **Sync Reading Log**: Merge a captured inbox file into `reading.json` (metadata enrichment, dedup by URL, newest-first), then commit and optionally push. Archives the consumed file to `~/rlog/processed/`.
- The **Blog Repository Path** preference is now optional, so the extension installs and runs (for capture) with zero configuration.

## [Initial Version] - {PR_MERGE_DATE}

- **Log Read**: Instantly add the current article to your 'read' history (`reading.json`).
- **Read Later**: Save articles to your private queue (`reading_list.json`).
- **Log Window**: Bulk-save **all open tabs** in the active window to your public history.
- **Read Window Later**: Bulk-save **all open tabs** to your private queue.
- **View Read Log**: Open a window showing your reading history (`reading.json`).
- **View Reading List**: Open a window showing your saved “read later” items (`reading_list.json`).
- **Open Random Article**: Open a random article from your reading list in the browser.
- **Setup rlog**: One-click setup to inject the reading list page into your Next.js app.
