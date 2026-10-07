# Paper Agent

## [Raycast 2 Compatibility and Library Reliability] - {PR_MERGE_DATE}

- Update to Raycast API 2.6.3 and refresh dependencies.
- Report core and library failures separately from empty results, with preference and retry actions.
- Add query timeouts and cancellation, preserve search input after errors, and support responses up to 8 MiB.
- Add offline regression tests and document the Node.js 22.22.2 requirement.

## [Initial Release] - 2026-04-02

- **Run & automation:** Run Paper Agent pipeline (fetch, filter, summarize, deliver); Install / Remove Daily Schedule (launchd 04:00 + catch-up); Check Run Status (schedule, today’s result, last run metadata).
- **Browse & search:** Today Papers and Recent Papers with detail view; Search Papers across your local library.
- **Workflow:** Favorite Papers and Reading Queue (local storage); Open Paper Directory; Open Config Directory.
- **List actions:** Open paper/note, related papers, mark read/unread, add to favorites, add to reading queue.
- **Preferences:** Config file path, paper directory, Python executable; direction, summarize, and sources overrides (runtime config from Preferences; shared settings from core `config.yaml`).
