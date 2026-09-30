# Changelog

## [1.0.2] - 2026-02-27

- Fix: Preserve non-Raycast crontab content (env vars, other cron jobs, comments) across every save operation.
- Fix: Correct `no crontab` detection and macOS TCC permission error handling after switching from `exec` to `spawn`.

## [1.0.1] - 2026-02-09


- Fix: Critical shell injection vulnerability in `writeCrontab` by switching from `exec` to `spawn` and using `stdin`.

## [1.0.0] - 2026-02-09

- Initial release of Cron Manager.
- Features: Create, Edit, Delete, Run, Logs, Search.
- Created by tahazahit.
