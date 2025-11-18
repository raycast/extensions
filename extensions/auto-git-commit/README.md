# Auto Git Commit - Raycast Extension

An AI-powered Git commit assistant that helps developers manage multiple Git repositories and generate meaningful commit messages using Raycast AI. Reuse your existing Raycast AI subscription - no additional API costs needed!

## Features

### 🔍 Repository Management

- **Scan Git Repositories**: Automatically scan folders to find and save all Git repositories
- **Smart Organization**: Repositories are organized into sections: Pinned, With Changes, No Changes
- **Repository Details**: View git status, recent commits, and repository information in the detail panel
- **Quick Actions**: Open repositories in Finder, Terminal, or VS Code with one click

### 🤖 AI-Powered Commit Messages

- **Intelligent Generation**: Uses Raycast AI to analyze git diffs and generate meaningful commit messages
- **Multiple Styles**: Support for Conventional Commits, Simple one-line, and Gitmoji formats
- **Smart Diff Processing**: Automatically handles large diffs by sampling and prioritizing important changes
- **Context Awareness**: Repository context and custom instructions help AI generate better messages

### ⚡ Flexible Commit Modes

- **Preview Mode**: Review and edit AI-generated commit messages before committing
- **Auto Mode**: Commit immediately with AI-generated messages
- **Quick Mode**: 5-second countdown with option to cancel before committing

### 🎯 Smart Features

- **Usage Tracking**: Tracks repository usage to prioritize frequently used repos
- **Pinning**: Pin important repositories for quick access
- **Search**: Quickly find repositories by name or path
- **AI Context Generation**: Automatically generate repository context descriptions to improve commit message quality
- **Auto Stage & Push**: Optional auto-staging of files and auto-push after commit

## Getting Started

1. Install the extension from Raycast Store
2. Open Raycast and search for "Quick Git Commit" or "Manage Repositories"
3. Add your first repository or scan for repositories
4. Configure your preferences (commit mode, style, etc.)
5. Start generating AI-powered commit messages!

## Commands

### Quick Git Commit
Browse and manage your saved repositories. Select a repository to generate and commit with AI.

**Keyboard Shortcuts:**
- `⌘+C` - Commit changes
- `⌘+E` - Edit repository details
- `⌘+F` - Show in Finder
- `⌘+O` - Open in Terminal/IDE
- `⌘+N` - Add new repository

### Manage Repositories
Scan folders to discover Git repositories and perform batch operations.

**Features:**
- Scan multiple folders at different depths
- Batch generate AI context for repositories
- Select and manage multiple repositories at once
- Pin/unpin, delete, or refresh repositories in bulk

## Configuration

Access preferences via `⌘+,` in Raycast:

- **Commit Mode**: Choose between Preview, Auto, or Quick (5s countdown)
- **Commit Style**: Select your preferred commit message format
- **Custom AI Instructions**: Add custom instructions for AI generation
- **Terminal/IDE**: Set your preferred app to open repositories
- **Auto Stage All Files**: Automatically stage unstaged changes
- **Auto Push After Commit**: Push to remote after successful commits

## Requirements

- Raycast with AI subscription
- Git installed on your system
- macOS

## Privacy & Data

All data is stored locally on your machine. No data is sent to external services except Raycast AI for commit message generation.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Created by [Garrick Zhang](https://github.com/garrick_zhang)
