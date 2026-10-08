# Agent Client Protocol Changelog

## [Initial Version] - 2025-11-03

### Added

- **Core ACP Client Implementation**: Full Agent Client Protocol support with subprocess-based agent connections, proper process management, and lifecycle handling
- **Interactive Chat Interface**: Rich list-based UI with real-time streaming responses, message history, and follow-up conversation support
- **Built-in Agent Support**: Pre-configured agents including Claude Code and Gemini CLI
- **Custom Agent Configuration**: Ability to add and manage custom ACP-compatible agents
- **Session Management**: Conversation persistence, context sharing between messages, and multi-turn interactions
- **File Operations**: Support for reading files, writing files, and editing files through ACP protocol with security controls
- **Terminal Integration**: Execute terminal commands through agents with proper output handling
- **Security Features**: File access controls with pattern blocking for sensitive files (.env, credentials, etc.), path validation, and size limits
- **Comprehensive Testing**: Unit tests, integration tests, and end-to-end tests for core functionality
- **Error Handling**: Robust error handling with user-friendly error messages and logging
- **Performance Monitoring**: Built-in performance logging and metrics tracking