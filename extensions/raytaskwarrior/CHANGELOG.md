# RayTaskwarrior Changelog

## [Fix] - 2026-01-28

- Avoid lock errors (`Clear working set query: database is locked: Error code 5: The database file is locked`) due to overlapping `task` invocations.

## [Fix] - 2025-03-02

- Prevent `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` error when reading tasks

## [Initial Version] - 2023-06-08

