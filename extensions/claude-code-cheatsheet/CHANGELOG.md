# Claude Code Cheatsheet Changelog

## [1.2.0] - 2025-08-18

- Add support for Claude Code v1.0.55 through v1.0.81 with 19+ new features
- Add new CLI flag: `--settings` for loading additional settings from JSON file or string
- Add 9 new environment variables including Claude 4.1 Opus region support and IDE configuration options
- Add 9 comprehensive settings.json configuration options including hooks, model overrides, and AWS authentication
- Enhance permissions system with `ask` option for confirmation-based access control
- Improve data accuracy with dual-source verification using official documentation and actual CLI output
- Expand total items from 121 to 140 comprehensive Claude Code references
- Update version compatibility to support v1.0.55 - v1.0.81+
- Refine data quality by removing standard environment variables and focusing on Claude Code-specific features

## [1.1.0] 2025-08-04

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

## [Initial Version] 2025-06-24

- Added the initial version of the Claude Code Cheatsheet.
- Browse and search for commands, options, and keywords.
- Copy details to the clipboard.
