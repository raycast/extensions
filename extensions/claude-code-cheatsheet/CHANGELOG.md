# Claude Code Cheatsheet Changelog

## [1.1.0] {PR_MERGE_DATE}

### Added
- Claude Code v1.0.51-v1.0.54+ support with complete feature coverage
- New basic commands:
  - `claude setup-token` - Set up long-lived authentication tokens
  - `claude install` - Install Claude Code native build
- New CLI flags:
  - `--append-system-prompt` - Append system prompt to default
  - `--fallback-model` - Enable automatic model fallback
  - `--ide` - Automatically connect to IDE on startup
  - `--strict-mcp-config` - Strict MCP server configuration
  - `--session-id` - Use specific session ID (UUID)
- New AWS Bedrock environment variables:
  - `AWS_BEARER_TOKEN_BEDROCK` - Bedrock API authentication
  - `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` - AWS region override
- Enhanced `--permission-mode` with all available choices (acceptEdits, bypassPermissions, default, plan)
- Version compatibility information in README (v1.0.51 - v1.0.54+)

### Changed
- All new features marked with ✨ NEW badges for easy identification
- Updated data structure to include latest Claude Code functionality

## [Initial Version] {PR_MERGE_DATE}

- Added the initial version of the Claude Code Cheatsheet.
- Browse and search for commands, options, and keywords.
- Copy details to the clipboard.
