# AI CLI - Raycast Extension

A powerful Raycast extension that provides seamless access to multiple AI CLI tools for AI-powered assistance, text
formatting and communication enhancement. Ask your AI Agent CLI any questions using Claude Code, OpenAI Codex, Gemini
CLI, or Cursor CLI with customizable templates and writing tones.

## Features

🤖 **Multi-AI Support**: Access Claude Code, OpenAI Codex, Gemini CLI, and Cursor CLI from one interface  
📝 **Smart Text Formatting**: Transform clipboard text for Slack, emails, and more  
🎨 **Custom Templates**: Create and manage personalized formatting templates  
🎭 **Writing Tones**: Apply different writing styles (professional, casual, technical, etc.)  
⚡ **Quick Actions**: Copy results and view detailed prompts  
🔄 **Follow-up Processing**: Continue conversations and refine results  
💾 **Persistent Settings**: Remember your preferred agents, templates, and configurations

## Prerequisites

Before using this extension, you'll need to install at least one of the supported AI CLI tools:

### Claude Code (Recommended)

```bash
# Install Claude Code and setup authentication
npm install -g @anthropic-ai/claude-code
claude setup-token
```

### OpenAI Codex CLI

```bash
# Install via Homebrew or your preferred method
brew install codex-cli
# Or via npm
npm install -g @openai/codex
```

### Gemini CLI

```bash
# Install Gemini CLI
brew install gemini-cli
# Or via npm
npm install -g @google/gemini-cli
```

### Cursor CLI

```bash
# Install Cursor Agent
curl https://cursor.com/install -fsS | bash
```

## Installation

1. Install the extension from the Raycast Store or build from source
2. Configure your preferred AI agent in the extension preferences
3. Set up the required API tokens/authentication for your chosen AI tools

## Configuration

### Extension Preferences

The extension requires configuration of your AI tools through Raycast preferences:

**Default Agent**: Choose your primary AI agent (Claude Code, Codex CLI, Gemini CLI, or Cursor CLI)

**Path Configuration**: Set the executable paths for each CLI tool:

- Claude Code: `~/.claude/local/claude` (default)
- Codex CLI: `/opt/homebrew/bin/codex` (default)
- Gemini CLI: `/opt/homebrew/bin/gemini` (default)
- Cursor CLI: `~/.local/bin/cursor-agent` (default)

**Authentication**: Configure API tokens for each service:

- Claude Code: OAuth Token (run `claude setup-token`)
- OpenAI: Login with OpenAI OR Use OpenAI API Key
- Gemini: Login with Google OR Use Gemini API Key
- Cursor: Login with Cursor OR Use Cursor API Key

**Working Directory**: Set the directory for AI operations (default: `~`)

## Usage

### Ask AI Agent

The main command provides three ways to get AI assistance:

1. **From Clipboard**: Automatically processes text from your clipboard
2. **Manual Input**: Type or paste text directly in the search bar
3. **Follow-up**: Continue conversations with additional questions

Note: The extension always generates a single result per run. To iterate, use follow-up questions — each follow-up
produces one additional result.

#### Text Formatting Templates

**Built-in Templates**:

- **Slack**: Casual, engaging team communication with emoji support
- **Code Review**: Technical feedback for pull requests and code reviews across platforms
- **Email**: Professional business communication with proper structure
- **Bug Report**: Structured problem descriptions for issue tracking systems
- **Technical Documentation**: Professional technical documentation with clear structure
- **Commit Message**: Conventional commit messages following standard formats
- **Custom**: Use your own instructions for specialized formatting

#### Writing Tones

Choose from various writing styles to match your communication needs:

**Core Tones:**

- **Default** - Natural AI response without tone modification
- **Professional** - Formal, polished communication for business contexts
- **Conversational** - Friendly, collaborative tone like pair programming with a colleague
- **Technical** - Precise, expert-level communication assuming domain knowledge
- **Educational** - Clear explanations with context and examples for learning
- **Concise** - Brief, direct responses with maximum impact and minimum words

**When to Use:**

- **Code Analysis**: Technical tone
- **Implementation Suggestions**: Conversational or Technical tone
- **Finding Examples**: Educational tone
- **Quick Questions**: Concise tone
- **Learning/Tutorials**: Educational tone
- **Code Reviews**: Technical tone
- **Slack/Teams**: Conversational tone
- **GitHub PRs**: Technical tone
- **Business emails**: Professional tone
- **Documentation**: Educational or Technical tone

### Manage Templates

Create, edit, and organize custom formatting templates:

1. Open "Manage Templates" command
2. Click "Create New Template" or edit existing ones
3. Define template name, instructions, and optional sections
4. Use templates in the main Ask AI Agent command

### Manage Tones

Create and customize writing tones:

1. Open "Manage Tones" command
2. Add new tones or modify existing ones
3. Apply tones to any formatting request

## Advanced Features

### Prompt Inspection

View the exact prompts sent to AI agents:

- Click "Show Prompt" on any result
- Understand how templates and tones are combined
- Learn prompt engineering techniques

### Error Handling

Robust error handling with helpful feedback:

- Authentication issues with setup guidance
- Path validation with suggestions
- Network connectivity problems
- CLI tool availability checks

### Execution Runner

The extension uses a single execution engine:

- `useAgentRunner`: Builds prompts and commands, streams output via `useExec`, and exposes raw errors.
- `useAgentProcessing`: UI-facing hook that formats results and centralizes user-facing error handling.

Notes:

- Live streaming updates state on every chunk for a responsive UI.
- Reruns with identical args are guaranteed by injecting a per-run `RUN_ID` environment variable.
- Cancellation: `useExec` cannot abort a running process. The `cancel()` method only stops local updates; use `timeout`
  for hard stops.

## Keyboard Shortcuts

- `⌘ + Enter`: Submit/Process text
- `⌘ + C`: Copy result to clipboard
- `⌘ + P`: Show full prompt details

## Development

### Commands Available

```bash
npm run dev          # Start development mode
npm run build        # Build for production
npm run lint         # Check code style
npm run test         # Run test suite
npm run type-check   # TypeScript validation
npm run validate     # Run all quality checks
npm run publish      # Publish to Raycast Store
```

### Project Structure

```
src/
├── components/        # React components
├── hooks/            # Custom React hooks
├── agents/           # AI CLI integration
├── templates/        # Built-in and custom templates
├── utils/            # Utility functions
└── types/            # TypeScript definitions
```

## Security & Privacy

- API tokens are stored securely in Raycast preferences
- No data is transmitted to external services beyond your chosen AI providers
- All CLI communication happens locally on your machine
- Clipboard content is processed locally and never cached permanently

## Troubleshooting

### Common Issues

**Authentication Errors**:

1. Verify API tokens are correctly set in preferences
2. Check that CLI tools are properly installed
3. Ensure paths to executables are correct

**CLI Tool Not Found**:

1. Verify installation of your chosen AI CLI tool
2. Check the executable path in preferences
3. Ensure the tool is accessible from command line

**Processing Failures**:

1. Check internet connectivity
2. Verify API quotas and limits
3. Try a different AI agent if one is having issues

### Getting Help

1. Check the extension preferences for configuration issues
2. Verify CLI tool installations and authentication
3. Review error messages for specific guidance
4. Report issues on the project repository

## Contributing

This extension is built with TypeScript, React, and the Raycast API. Contributions are welcome!

1. Fork the repository
2. Make your changes
3. Run tests: `npm run validate`
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for the Raycast community**
