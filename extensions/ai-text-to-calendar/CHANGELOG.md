# AI Text to Calendar Changelog

## [Fix Crash on Launch] - {PR_MERGE_DATE}

- Fix the command failing with `Package subpath './_shims/auto/runtime' is not defined by "exports"` by upgrading the OpenAI SDK from v4 to v7, which no longer self-references `_shims`

## [Bug Fix and Enhancement] - 2025-01-15
- 🐞 Bug fix - preference api call and author id
- 👨‍🍳 Customable service - fill your own LLM service endpoint and model name
- 💬 Multiple Language Support - Set your preferred language for events
- 🍧 Minor prompt adjustment

## [Initial Version] - 2024-12-09
