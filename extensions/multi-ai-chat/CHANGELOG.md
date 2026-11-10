# Multi AI Chat Changelog

## [Improve Saved Prompt Reliability] - 2026-11-10

- Prevent concurrent operations on the same Mac from reverting saved prompt edits.
- Keep prompt content and revisions consistent, including when the system clock moves backwards.
- Keep saved prompts usable locally when iCloud sync fails, with clear sync status notifications.
- Prevent duplicate prompts when retrying a save or submitting a form repeatedly.

## [Initial Release] - 2026-09-24

- Open one prompt in ChatGPT, Claude, Grok, and Perplexity using existing browser sessions.
- Choose zero to five tabs for each supported provider.
- Create reusable saved prompts with named arguments and Raycast Quicklinks.
- Select a preferred browser or use the macOS system default.
