# AI Screenshot Changelog

## [Fix Crash on Launch] - {PR_MERGE_DATE}

- Fix the command failing with `Package subpath './_shims/auto/runtime' is not defined by "exports"` by upgrading the OpenAI SDK from v4 to v7, which no longer self-references `_shims`

## [Initial Version] - 2024-05-21
