# Rituals Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Activate a ritual to open its apps, websites and files and run shell commands.
- Deactivate to run each command's stop (reverse order), then quit the apps it opened.
- Per-command readiness waits (e.g. wait for `docker info` before `docker start`).
- Browser selection for a ritual's URLs, plus Chromium browser-profile support.
- Fast mode (open apps/URLs in parallel) and an optional delay between commands.
- Rich detail pane on Activate and Manage, with Recent / All sections.
- Quick Open to launch a single item from any ritual.
- Create Ritual with AI, plus a portable AI skill for generating import-ready JSON.
- Import / export rituals as JSON.
