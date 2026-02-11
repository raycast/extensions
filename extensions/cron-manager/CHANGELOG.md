# Changelog

## [1.0.1] - 2026-02-09

- Fix: Critical shell injection vulnerability in `writeCrontab` by switching from `exec` to `spawn` and using `stdin`.

## [1.0.0] - 2026-02-09

- Initial release of Cron Manager.
- Features: Create, Edit, Delete, Run, Logs, Search.
- Created by tahazahit.