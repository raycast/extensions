# Summarize YouTube Video Changelog

## [Fix] - 2026-03-17

- 🔧 Fix transcript fetching

## [Chore] - 2026-02-06

- Moved AbortController inside useEffect
- Parallelized video data and transcript fetching
- Added stream listener cleanup with cancelled flags
- Created singleton SDK clients
- Optimized O(n) array updates in streaming
- Fixed history sorting (newest first)

## [Fix] - 2026-01-29

- Fix transcript XML parsing for YouTube's srv3 format (extract text from `<s>` segments)
- Remove deprecated "Summarize YouTube Video" command

## [Fix] - 2026-01-29

- 🔧 Fix video ID extraction for YouTube URLs with query params (e.g. `?app=desktop&v=...`)
- 🔧 Fix transcript parsing when caption XML uses nested tags (e.g. `<p><s>text</s></p>`)

## [Fix] - 2026-01-27

- 🔧 Fix transcript fetching using ANDROID client API
- ⬆️ Upgraded dependencies

## [Feat] - 2025-10-28

- 🖼️ Added Support for Windows

## [Fix] - 2025-10-10

- Update the way transscriptions is handled

## [Fixes] - 2025-06-27

- 📚 Remove `youtube-transcript` package and install `youtube-transcript-api`

## [New Features] - 2025-06-04

- 📜 Added support for a summary history.
- ⬆️ Upgraded dependencies

## [New Features] - 2025-03-05

- 🤖 created separate command for Ollama

## [New Features] - 2025-02-19

- ⁉ Reworked the follow up questions to be a list of questions and answers

## [New Features] - 2025-01-18

- 🔎 Added support for clipboard and browser extension detection
- 🪓 Split AIs into separate commands

## [New Features] - 2024-12-21

- Added preferences to set a custom OpenAI API endpoint
- Added preferences to set a custom OpenAI model
- Added preferences to set a custom Anthropic model

## [New Features] - 2024-12-20

### Major Version update 🎉

- 🤖 Added Anthropic Claude
- 🔎 Added Action to ask follow up questions
- 🧑‍💻 Improved AI instruction snippets
- 🔧 Added up to date AI models as defaults
  - Raycast AI: Your selected AI Model
  - OpenAI: `gpt-4o`
  - Anthropic: `claude-3-5-sonnet-latest`
- 🐛 Fixed issues with long loading time
- 🖼️ Added new Icon

## [Fixes] - 2024-05-01

- ⬆️ Upgraded dependencies
- 🐛 Fixed an issue with fetching transcripts

## [Minor Improvements] - 2023-06-02

- 📝 update readme for clarity
- 🐛 fix return toast for video transcripts
- 🩹 fix result not having linebreaks from time to time (It can still happen, but should be fixed
  for most cases)
- 🔧 add new config options for `creativity`
- 🧑‍💻 improve ai instruction snippets
- ⬆️ upgrade dependencies

## [New Features] - 2023-05-16

- renamed command
- added support for custom languages

## [New Features] - 2023-05-15

- rewrote most of the codebase
- added support for Raycast AI

## [Initial Version] - 2023-04-26

Initial version
