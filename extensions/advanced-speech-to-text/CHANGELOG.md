# Changelog

All notable changes to this project will be documented in this file.

## [Fix crash on launch] - {PR_MERGE_DATE}

- Upgrade the OpenAI SDK to v7. `openai@4` loads its runtime shim through a package self-reference that store builds can't resolve, so commands failed with `Package subpath './_shims/auto/runtime' is not defined by "exports"`.

## [1.0.0] - 2025-06-10

### Features

- **Dictate Command**: Instant recording with automatic transcription
- **Recording History Command**: View and manage previous transcriptions
- **Smart Formatting**: Convert transcriptions to Email, Slack, or Report formats
- **Customizable Prompts**: Configure custom prompts for each format type
- **Multi-language Support**: 99+ languages with auto-detection
- **Advanced Configuration**: Temperature, response format, and custom prompt settings
