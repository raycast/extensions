# Changelog

All notable changes to the Claude Git Tools extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Initial Release] - {PR_MERGE_DATE}

### Added

- **Git Push** command — stage, commit, and push changes via Claude
- **Create PR** command — create pull requests with AI-generated descriptions and branch picker
- **Review PR** command — review open PRs with Claude, merge/close from Raycast
- **View Tasks** command — monitor running and completed tasks with real-time streaming output
- **Manage Folders & Skills** command — configure repo scan directories and bind custom skill files
- **Manage Model** command — switch between Haiku / Sonnet / Opus
- Custom skill file support with `$ARGUMENTS` input and structured output
- Review report preview via `!--------!` delimiter extraction
- Background task execution as detached processes (survives Raycast window closure)
- macOS notifications via `terminal-notifier` with clickable PR/commit links
- Auto-extraction of Git URLs (GitHub, GitLab, Bitbucket) from Claude output
- SSH remote to HTTPS auto-conversion
