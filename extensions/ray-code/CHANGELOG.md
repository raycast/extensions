# Ray Code Changelog

## [Fix the issue with accessing the user shell properly] - {PR_MERGE_DATE}

- `process.env.SHELL` is undefined, use the shell-env package instead

## [Auto Edit, Run Command and Git Tools] - 2026-01-01

### Added
- **run-command**: Execute shell commands in the workspace
- **git**: Execute git commands
- **Auto Edit preference**: Skip confirmation prompts for file operations when enabled

### Enhanced
- **grep**: Upgraded to support workspace-wide recursive search with glob pattern filtering (e.g., `*.ts`, `*.{ts,tsx}`)

## [Initial Version] - 2025-11-09