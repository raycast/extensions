# Agent Skills Manager

A Raycast extension for managing agent skills across multiple AI coding assistants (Cursor, Continue, Cline, and 40+ others). Browse, install, update, and manage skills from skills.sh or GitHub repositories—all from Raycast.

## Features

- 🗂️ **Browse Skills** - Search and browse skills from the skills.sh catalog
- 📦 **Install Skills** - Install skills from skills.sh or GitHub repositories
- 🔄 **Multi-Agent Support** - Install skills to multiple agents simultaneously
- 📋 **Manage Installed Skills** - View, update, and delete installed skills
- 🔍 **Update Detection** - Git-based update detection using commit hash comparison
- ⚙️ **Flexible Installation** - Choose between symlink or copy installation modes
- 📁 **Scope Management** - Install skills globally or per-project
- 🎯 **Auto-Discovery** - Automatically discover skills in GitHub repositories

## Installation

1. Install the extension from the [Raycast Store](https://raycast.com) or build from source
2. No configuration required—the extension automatically detects installed agents

### Manual Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Open Raycast → Extensions → Import Extension
5. Select this directory

## Usage

### Browse Skills

1. Open Raycast (`Cmd + Space`)
2. Type "Browse Skills" or "Agent Skills"
3. Search for skills from the skills.sh catalog
4. View install counts and descriptions
5. See install status (Installed / Update Available / Not Installed)
6. Click to install or update skills

### Install from GitHub

1. Open Raycast and search for "Browse Skills"
2. Enter a GitHub repository URL when prompted
3. Extension will automatically discover skills in the repository
4. Select agents and installation mode (symlink or copy)
5. Choose scope (global or project)

### Installed Skills

1. Open Raycast and search for "Installed Skills"
2. View all installed skills across all agents
3. See which agents have each skill installed
4. Check for updates (Git commit hash comparison)
5. Reinstall skills to update to latest version
6. Delete skills from specific agents or all agents

## Supported Agents

This extension supports 40+ AI coding assistants including:
- Cursor
- Continue
- Cline
- GitHub Copilot
- And many more...

See `src/agents.ts` for the complete list.

## How Update Detection Works

The extension uses Git commit hash comparison to detect updates:
1. When a skill is installed, the current Git commit hash is stored
2. On update check, the extension compares the stored hash with the latest commit hash from the remote repository
3. If hashes differ, an update is available

## Screenshots

Add screenshots to showcase your extension. Place them in the `metadata` folder at the root of your extension directory.

**Screenshot Requirements:**
- Size: 2000 x 1250 pixels (16:10 aspect ratio)
- Format: PNG
- Maximum: 6 screenshots (recommended: at least 3)
- Place files in: `metadata/` folder

**Screenshots:**
1. `metadata/browse-skills.png` - Browse skills view
2. `metadata/skills-metadata.png` - Skill details view
3. `metadata/select-agent.png` - Agent selection
4. `metadata/select-install-type.png` - Installation options
5. `metadata/installation-summary.png` - Installation summary
6. `metadata/installed-skills.png` - Installed skills view

## Development

### Prerequisites

- Node.js 16+
- Raycast app (macOS or Windows)
- Git (for cloning repositories)

### Setup

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Run in development mode
npm run dev
```

### Available Scripts

- `npm run build` - Build extension for production
- `npm run dev` - Start development mode with hot reload
- `npm run lint` - Lint code
- `npm run fix-lint` - Fix linting issues automatically
- `npm run type-check` - Type check without building
- `npm run publish` - Publish to Raycast Store

## Architecture

- `src/agents.ts`: Agent detection and configuration
- `src/skills-api.ts`: skills.sh API client
- `src/repository-manager.ts`: GitHub cloning and skill discovery
- `src/installer.ts`: Skill installation (symlink/copy)
- `src/skill-registry.ts`: Lock file management
- `src/update-detector.ts`: Git-based update detection
- `src/commands/`: Raycast command implementations
  - `browse-skills.tsx`: Browse and search skills
  - `list-installed.tsx`: Manage installed skills
  - `install-flow.tsx`: Installation wizard

## Requirements

- macOS or Windows (Raycast for Windows is in beta)
- Node.js 16+ (for development)
- Git (for cloning repositories)

## Platform Support

This extension supports both macOS and Windows:
- **macOS**: Full support
- **Windows**: Full support (Raycast for Windows beta)

Note: Some agent-specific paths may differ between platforms, but the extension handles platform differences automatically.

## License

MIT
