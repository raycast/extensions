# ClaudeCast

**Claude Code workflows at your fingertips** - A comprehensive Raycast extension that bridges Claude Code's powerful agentic CLI with Raycast's instant-access UI.

## Features

### Phase 1: Core Features

#### Ask Claude Code
Quick prompt with automatic context capture from VS Code. Select text anywhere, hit the hotkey, and get answers without opening a terminal.

- Auto-detects current project from VS Code
- Captures selected text and clipboard
- Shows git branch context
- Supports all Claude models (Sonnet, Opus, Haiku)
- Continue conversation in terminal

#### Launch Project
Fast project switching for Claude Code. Browse all your projects with favorites, recents, and session counts.

- Discovers projects from Claude Code history
- Integrates with VS Code recent workspaces
- Launch new session or continue existing
- Open in VS Code or Finder
- Manage favorites

#### Browse Sessions
Find and resume any Claude Code conversation across all projects.

- Search sessions by content
- Filter by project
- View conversation preview
- Resume, fork, or delete sessions
- See cost and token usage per session

#### Quick Continue
One keystroke to continue your last Claude Code session. No UI - just launches directly.

#### Git Actions
Git-aware Claude Code workflows for common tasks.

- Review staged changes
- Generate commit messages
- Explain recent diffs
- Review unstaged changes
- Summarize branch changes

### Phase 2: Power User Features

#### Prompt Library
Curated collection of production-tested prompts with variable substitution.

**Categories:**
- Planning & Architecture
- Test-Driven Development
- Code Review & Security
- Refactoring
- Debugging
- Documentation
- Advanced Multi-Step Workflows

#### Transform Selection
One-keystroke code transformations from any app.

- Explain code
- Explain regex
- Find bugs
- Convert to another language
- Add TypeScript types
- Optimize performance
- Add comments
- Write tests

#### Menu Bar Monitor
Real-time Claude Code status in your menu bar.

- Active session indicator
- Today's cost and session count
- Quick access to all commands

#### Usage Dashboard
Detailed cost and usage metrics.

- Daily/weekly/monthly trends
- Cost breakdown by project
- Top expensive sessions
- ASCII cost charts

## Installation

### Prerequisites

1. **Claude Code CLI**: Install the Claude Code CLI tool
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Raycast**: Download from [raycast.com](https://raycast.com)

### Install Extension

1. Clone this repository or download the extension
2. Open Raycast and search for "Import Extension"
3. Select the `claude-cast` directory
4. Or run in development mode:
   ```bash
   cd claude-cast
   npm install
   npm run dev
   ```

## Setup

### OAuth Token (Required for API Features)

Some features (Ask Claude Code, Transform Selection, Git Actions) require an OAuth token to work in Raycast's sandboxed environment:

1. Generate a long-lived OAuth token:
   ```bash
   claude setup-token
   ```

2. Copy the token and add it to ClaudeCast preferences:
   - Open Raycast → Search "ClaudeCast" → Press `⌘,`
   - Paste the token in the "OAuth Token" field

### Configuration

Open Raycast preferences and configure ClaudeCast:

- **Default Model**: Choose between Sonnet (balanced), Opus (most capable), or Haiku (fastest)
- **Terminal Application**: Select your preferred terminal (Terminal, iTerm, Warp, Kitty, Ghostty)
- **Claude Code Path**: Optionally specify a custom path to the Claude CLI binary
- **OAuth Token**: Long-lived token from `claude setup-token` (required for API features)

## Usage

### Keyboard Shortcuts (Suggested)

Set these in Raycast preferences:

| Command | Suggested Shortcut |
|---------|-------------------|
| Ask Claude Code | `⌘⇧C` |
| Quick Continue | `⌘⌥R` |
| Browse Sessions | `⌘⌥S` |
| Launch Project | `⌘⌥L` |
| Git Actions | `⌘⇧G` |
| Prompt Library | `⌘⌥P` |
| Transform Selection | `⌘⇧T` |

### Tips

1. **Context Capture**: For best results, select code in VS Code before triggering Ask Claude Code
2. **Project Detection**: Keep VS Code open in your project for automatic project detection
3. **Quick Continue**: Use this when you step away and want to resume your last conversation
4. **Prompt Library**: Start with built-in prompts, then create custom ones for your workflows
5. **Git Actions**: Stage your changes first, then use "Write Commit Message" for AI-generated commits

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix lint issues
npm run fix-lint
```

## Project Structure

```
claude-cast/
├── src/
│   ├── ask-claude.tsx          # Quick Prompt command
│   ├── browse-sessions.tsx     # Session Browser
│   ├── launch-project.tsx      # Project Launcher
│   ├── quick-continue.tsx      # Quick Continue
│   ├── git-actions.tsx         # Git Actions
│   ├── prompt-library.tsx      # Prompt Library
│   ├── transform-selection.tsx # Transform Selection
│   ├── menu-bar-monitor.tsx    # Menu Bar Monitor
│   ├── usage-dashboard.tsx     # Usage Dashboard
│   └── lib/
│       ├── claude-cli.ts       # Claude CLI integration
│       ├── session-parser.ts   # JSONL session parsing
│       ├── project-discovery.ts # Project detection
│       ├── context-capture.ts  # VS Code context capture
│       ├── terminal.ts         # Terminal launch utilities
│       ├── prompts.ts          # Built-in prompts
│       └── usage-stats.ts      # Usage statistics
├── assets/
│   └── command-icon.png        # Extension icon
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.

## Credits

Built with [Raycast](https://raycast.com) and [Claude Code](https://anthropic.com/claude-code).
