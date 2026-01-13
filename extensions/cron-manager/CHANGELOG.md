# Changelog

## [1.0.1] - {PR_MERGE_DATE}

- Fix: Critical shell injection vulnerability in `writeCrontab` by switching from `exec` to `spawn` and using `stdin`.

## [1.0.0] - {PR_MERGE_DATE}

- Initial release of Cron Manager.
- Features: Create, Edit, Delete, Run, Logs, Search.
- Created by tahazahit.