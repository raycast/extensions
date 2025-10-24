# 🚀 Project Manager - Raycast Extension

Complete Raycast extension to manage and quickly open your projects with your favorite code editor (Cursor, VS Code, Zed, WebStorm, Sublime Text) and Claude Code.

## ✨ Features

- **Add Project**: Add a new project with name, path, preferred editor and terminal
- **Open Project**: Open a project in your code editor and/or Terminal + Claude Code
- **Edit Project**: Modify existing project settings
- **List Projects**: List all your projects with their details
- **Delete Project**: Remove a project from the list

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm
- Raycast installed

### Installation Steps

1. **Install dependencies:**
```bash
cd path/to/project-manager
npm install
```

2. **Launch in development mode:**
```bash
npm run dev
```

The extension will automatically appear in Raycast!

## 🎯 Usage

### 1️⃣ Add a Project
- Launch **"Add Project"** in Raycast (⌘ + Space)
- Fill in:
  - Project name
  - Folder path (file selector)
  - Workspace file (optional): Select a `.workspace` file to open it directly
  - Code editor (Cursor, VS Code, Zed, WebStorm, Sublime Text)
  - Preferred terminal (Ghostty, iTerm, or Terminal)
  - Claude Code command: The command to launch Claude Code (default: `cc`)

### 2️⃣ Open a Project
- Launch **"Open Project"** in Raycast
- Search for your project in the list
- Choose an action:
  - **Open Both**: Opens your editor + Terminal + Claude Code
  - **Open in [Editor] Only**: Opens only your editor
  - **Open in Terminal + Claude Code**: Opens only the terminal with cc
- Shortcut: **⌘ + E** to edit the project

### 3️⃣ Edit a Project
- Launch **"Edit Project"** in Raycast
- Select the project to modify
- Modify its settings (name, path, workspace, editor, terminal)
- Save changes

### 4️⃣ List Projects
- Launch **"List Projects"** to see all your projects with:
  - 📄 icon if workspace configured
  - Green badge: editor
  - Blue badge: terminal
- Shortcut: **⌘ + E** to edit from the list

### 5️⃣ Delete a Project
- Launch **"Delete Project"**
- Select the project to remove
- Confirm deletion

## 🏗️ Project Structure

```
project-manager/
├── package.json           # Extension configuration
├── tsconfig.json          # TypeScript configuration
├── assets/
│   └── icon.png          # Extension icon
└── src/
    ├── add-project.tsx    # Command: Add a project
    ├── edit-project.tsx   # Command: Edit a project
    ├── open-project.tsx   # Command: Open a project
    ├── list-projects.tsx  # Command: List projects
    ├── delete-project.tsx # Command: Delete a project
    └── utils/
        └── storage.ts     # Local storage management
```

## 💾 Data Storage

Projects are stored in Raycast's LocalStorage. Format:

```typescript
type EditorType = "cursor" | "vscode" | "zed" | "webstorm" | "sublime";

interface Project {
  id: string;
  name: string;
  path: string;
  editor: EditorType;
  terminal: "ghostty" | "iterm" | "terminal";
  workspaceFile?: string; // Optional path to a .workspace file
  claudeCodeCommand: string; // Command to launch Claude Code
}
```

### 📄 Workspace Files

You can associate a `.workspace` file with your project. When you open the project in your editor, the workspace will be opened instead of just the folder. This allows you to:
- Keep your open tabs
- Maintain your project-specific editor configuration
- Open multiple folders at once (multi-root workspace)

## 💻 Supported Editors

- **Cursor**: AI-first editor based on VS Code
- **VS Code**: Microsoft's most popular editor
- **Zed**: Ultra-fast and modern editor
- **WebStorm**: JetBrains IDE for web development
- **Sublime Text**: Lightweight and performant editor

Each editor can be configured per project, allowing you to use different editors based on your needs.

## 💡 Supported Terminals

- **Ghostty**: Modern and fast terminal
- **iTerm**: Advanced terminal for macOS
- **Terminal**: Native macOS terminal

Each terminal automatically launches Claude Code in the project folder.

## ⚙️ Customizable Claude Code Command

The extension allows you to configure **per project** the command to launch Claude Code. Examples of possible commands:
- `cc` (default): If Claude Code is installed with the standard CLI
- `claude code`: If you installed with this command name
- `claude-code`: Variant with dash
- `/absolute/path/to/claude-code`: Full path if the command is not in PATH

This flexibility allows for different versions of Claude Code or different installations depending on the project.

## 🔧 Dependencies

- `@raycast/api`: Raycast API for extensions
- `@raycast/utils`: Raycast utilities
- Code editor of your choice
- `Claude Code CLI (cc)`: Must be installed and accessible in PATH

## 🛠️ Development

```bash
# Install dependencies
npm install

# Launch in dev mode
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Auto-fix lint
npm run fix-lint
```

## 📝 TODO

- [ ] Add a proper PNG icon (512x512px minimum)
- [x] Add ability to edit an existing project
- [x] Support for multiple editors (Cursor, VS Code, Zed, WebStorm, Sublime Text)
- [x] Support for `.workspace` files
- [x] Customizable Claude Code command per project
- [ ] Add custom global keyboard shortcuts
- [ ] Add tags/categories to organize projects
- [ ] Advanced search with filters
- [ ] Import/Export project configuration
- [ ] Favorites / Recent projects

## 📄 License

MIT

---

Created with ❤️ to manage your projects quickly with Raycast and Claude Code!
