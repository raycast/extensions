# Easy Vibe

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-blue?style=for-the-badge&logo=raycast)](https://www.raycast.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Easy Vibe** is a powerful Raycast extension designed specifically for AI developers, providing a comprehensive AI toolkit management solution. Through an intuitive interface, you can effortlessly manage multiple AI programming assistants, configure preferences, and quickly launch your preferred AI tools.

## ✨ Core Features

### 🚀 Version Management
- **Multi-tool Support**: Supports Claude Code, Gemini CLI, Qwen Code CLI, and other popular AI programming tools
- **Real-time Version Detection**: Automatically checks installed versions against the latest releases
- **Smart Updates**: One-click update functionality with support for both native CLI updates and npm global installations
- **Status Visualization**: Clear visual indicators for each tool's version status (up-to-date, outdated, unknown)

### ⚙️ Settings Configuration
- **Default AI Assistant**: Set your most frequently used AI tool as the default option
- **Package Manager Preferences**: Choose from npm, pnpm, or yarn as your preferred package manager
- **YOLO Agent Control**: Option to show/hide YOLO agent in settings
- **Persistent Settings**: All configurations are automatically saved and restored on next use

### 🎯 Quick Launch
- **One-click Launch**: Quickly start your preferred AI programming assistant through Raycast
- **Terminal Integration**: Automatically executes corresponding AI tool commands in the terminal
- **Parameter Support**: Supports passing specific command-line arguments for different AI agents

## 🛠️ Supported AI Tools

| Tool | Package Name | Update Method | Features |
|------|-------------|---------------|----------|
| **Claude Code** | `@anthropic-ai/claude-code` | Native CLI Update | Anthropic's official AI programming assistant |
| **Gemini CLI** | `@google/gemini-cli` | npm Global Install | Google's Gemini AI tool |
| **Qwen Code CLI** | `@qwen-code/qwen-code` | npm Global Install | Alibaba Cloud's Qwen programming assistant |
| **YOLO Agent** | `@yolo-ai/yolo` | npm Global Install | Optional YOLO AI agent |

## 📦 Installation

### Install via Raycast Store
1. Open Raycast
2. Search for "Easy Vibe"
3. Click the install button

## 🎮 User Guide

### Version Management (Vibe Version)
1. Open Raycast and type "Vibe Version"
2. View the current version status of all AI tools
3. Click on any tool to see detailed information
4. Use the update button in the action panel to upgrade versions

### Settings Configuration (Vibe Settings)
1. Open Raycast and type "Vibe Settings"
2. Configure your default AI assistant
3. Select your preferred package manager
4. Enable or disable YOLO agent

### Quick Launch (Vibe Coding)
1. Open Raycast and type "Vibe Coding"
2. Select the AI tool to launch
3. The tool will automatically start in the terminal

## 🔧 Development

### Requirements
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Raycast >= 1.70.0

### Development Commands
```bash
# Start development server
pnpm run dev

# Build the extension
pnpm run build

# Run code linting
pnpm run lint

# Automatically fix code issues
pnpm run fix-lint

# Publish to Raycast Store
pnpm run publish
```

### Project Structure
```
easy-vibe/
├── src/
│   ├── vibe-version.tsx    # Version management component
│   ├── vibe-settings.tsx   # Settings configuration component
│   └── vibe-coding.tsx     # Quick launch component
├── assets/
│   └── extension-icon.png  # Extension icon
├── package.json            # Project configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## 🏗️ Technical Architecture

### Core Technology Stack
- **React 19**: User interface construction
- **TypeScript**: Type-safe JavaScript
- **@raycast/api**: Raycast extension API
- **@raycast/utils**: Raycast utility library

### Design Principles
- **Single Responsibility**: Each component focuses on specific functionality
- **Open/Closed Principle**: Easy to extend with new AI tool support
- **Dependency Inversion**: Depend on abstractions rather than concrete implementations
- **Error Handling**: Comprehensive error handling and user feedback

### State Management
- **LocalStorage**: Persistent storage for user settings
- **React Hooks**: Component state management
- **Async Operations**: Using async/await for version checking and updates

## 🤝 Contributing

We welcome all forms of contributions!

### Development Workflow
1. Fork this repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Code Standards
- Use TypeScript for type checking
- Follow ESLint rules
- Keep code clean and readable
- Add necessary comments and documentation

## 🙏 Acknowledgments

- [Raycast](https://www.raycast.com/) - For providing an excellent extension platform
- [Anthropic](https://www.anthropic.com/) - Claude Code AI assistant
- [Google](https://www.google.com/) - Gemini CLI tool
- [Alibaba Cloud](https://www.alibabacloud.com/) - Qwen Code CLI


---

**Making AI programming simpler and development more efficient!** 🚀