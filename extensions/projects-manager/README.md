# Projects Manager - Raycast Extension

A comprehensive project management extension for Raycast that allows you to organize, create, and manage all your development projects from one centralized location. This extension has been over a year in development and is designed for developers who want quick access to their projects with powerful automation features.

## 🚀 Features

### Core Project Management
- **Project Organization**: Organize projects into categories (e.g., React, Node.js, SwiftUI, etc.)
- **Quick Search**: Search projects by name, category, or custom aliases
- **Fast Access**: Open projects in your preferred editor or IDE with keyboard shortcuts
- **Project Templates**: Create projects from custom templates with dynamic placeholders
- **Project Aliases**: Add custom aliases to projects for faster searching

### Git Integration
- **Repository Management**: Create, link, and manage GitHub repositories
- **Quick Actions**: Push, pull, and manage git operations directly from Raycast
- **Auto-Repository Creation**: Automatically create GitHub repos when creating new projects
- **Repository Detection**: Automatically detect existing git repositories

### Advanced Features
- **Coolify Integration**: Deploy and manage applications through Coolify
- **AI-Generated PRDs**: Generate Product Requirement Documents using AI
- **Taskmaster Integration**: Automatic `.taskmaster` folder structure creation
- **Template System**: Support for both command-based and folder-based templates
- **Project Cloning**: Clone GitHub repositories directly into organized folders

## 📦 Installation

1. Open Raycast
2. Search for "Extensions"
3. Search for "Projects" by JoshuaRileyDev
4. Install the extension

## ⚙️ Setup

### Required Configuration

1. **Projects Folder**: Set your main projects directory where all projects will be organized
   - Open Raycast Settings → Extensions → Projects → Projects Folder
   - Choose your preferred projects directory (e.g., `~/Developer/Projects`)

### Optional Configuration

2. **Coolify Integration** (Optional):
   - **Coolify URL**: Your Coolify instance URL
   - **Coolify Token**: Your Coolify API token for authentication

## 🎯 Usage

### Commands Available

The extension provides several commands accessible through Raycast:

#### 1. Search Projects (`search-projects`)
Search and manage all your existing projects.

**Features:**
- Filter by category using the dropdown
- Search by project name, category, or aliases
- Recently opened projects appear first
- Git repository status indicators
- Coolify deployment status

**Keyboard Shortcuts:**
- `⌘ + O`: Open project in default application
- `⌘ + C`: Open project in Cursor (if not default)
- `⌘ + T`: Open project in Terminal
- `⌘ + L`: Open project in Claude Code
- `⌘ + R`: Open GitHub repository (if exists)
- `⌘ + G`: Push to GitHub (with commit message)
- `⌘ + ⇧ + G`: Pull from GitHub
- `⌘ + N`: Rename project
- `⌘ + E`: Edit project aliases
- `⌘ + S`: Edit project settings
- `⌘ + D`: Delete git repository

#### 2. Create Project (`create-project`)
Create new projects using templates.

**Process:**
1. Select a project category (React, Node.js, SwiftUI, etc.)
2. Choose a template from available options
3. Enter project name and description
4. Optionally create a Git repository
5. Project is automatically created and opened

#### 3. Search Categories (`search-categories`)
View and manage project categories.

#### 4. Create Category (`create-category`)
Create new project categories with custom settings.

#### 5. Clone Project (`clone-project`)
Clone GitHub repositories into organized project folders.

**Features:**
- Auto-detects GitHub URLs from active browser tabs
- Automatically extracts project name from repository URL
- Places cloned project in appropriate category folder

#### 6. Push to GitHub (`push-to-github`)
Background command for pushing projects to GitHub.

#### 7. Create Template (`create-template`)
Create reusable project templates.

#### 8. Search Templates (`search-templates`)
Browse and manage project templates.

## 📋 Detailed Examples

### Example 1: Creating a React Project

1. Open Raycast and type "Create Project"
2. Select the "React" category
3. Choose from available templates:
   - **Default**: Basic React setup command
   - **Vite Template**: Uses a pre-configured Vite template folder
4. Enter project details:
   - **Name**: `my-awesome-app`
   - **Description**: `A task management application with real-time collaboration`
   - **Create Git Repository**: ✅ (checked)
5. The extension will:
   - Create project folder at `~/Projects/React/my-awesome-app`
   - Run template command (e.g., `npm create vite@latest my-awesome-app`)
   - Generate AI-powered PRD based on description
   - Create `.taskmaster` folder structure
   - Initialize git repository
   - Create GitHub repository (if configured)
   - Open project in your default React editor

### Example 2: Managing an Existing Project

1. Open Raycast and type "Search Projects"
2. Filter by category or search for project name
3. Select your project and use available actions:
   - **Open**: Opens in configured IDE (VS Code, Cursor, Xcode, etc.)
   - **Terminal**: Opens terminal in project directory
   - **GitHub**: Opens repository in browser
   - **Push Changes**: Commit and push with custom message
   - **Pull Changes**: Fetch latest changes from remote

### Example 3: Using Project Aliases

1. In "Search Projects", select a project
2. Press `⌘ + E` to edit aliases
3. Add aliases separated by commas: `api, backend, server`
4. Now you can search for the project using any of these aliases

### Example 4: Cloning a Repository

1. Navigate to a GitHub repository in your browser
2. Open Raycast and type "Clone Project"
3. The extension auto-detects the GitHub URL
4. Select the appropriate category (React, Node.js, etc.)
5. The repository is cloned and organized automatically

## 🏗️ Template System

The extension supports two types of templates:

### Command Templates
Execute commands to create projects (e.g., `npm create vite@latest {projectName}`)

**Dynamic Placeholders:**
- `{projectName}`: Replaced with the actual project name
- `{projectSlug}`: Replaced with a URL-friendly version of the project name

### Folder Templates
Copy pre-configured folder structures with dynamic content replacement.

**Template Features:**
- File and folder names can use `{projectName}` and `{projectSlug}` placeholders
- File contents automatically replace placeholders
- Setup commands run after template creation

### Creating Custom Templates

1. Use "Create Template" command
2. Configure template settings:
   - **Name**: Template display name
   - **Category**: Which project category it belongs to
   - **Type**: Command or Folder template
   - **Command/Path**: Template command or folder path
   - **Setup Command**: Post-creation command (optional)
   - **Auto Create Repo**: Automatically create git repository

## 🔧 Integration Features

### GitHub Integration

**Automatic Repository Creation:**
- Creates repositories using the GitHub CLI
- Sets up proper remotes
- Handles initial commits

**Repository Management:**
- Push/pull operations with custom commit messages
- Open repositories in browser
- Delete and reinitialize repositories

### Coolify Integration

**Prerequisites:**
- Coolify URL and API token configured
- GitHub repository with Coolify-compatible application

**Features:**
- View Coolify applications and projects
- Deploy projects to Coolify servers
- Manage Coolify project associations

### AI-Powered PRD Generation

When creating projects with descriptions:
1. AI generates a comprehensive Product Requirement Document
2. PRD is saved to `.taskmaster/docs/prd.txt`
3. Uses project description as input for detailed requirements

### Taskmaster Integration

Automatically creates project structure:
```
project-name/
├── .taskmaster/
│   └── docs/
│       └── prd.txt (if description provided)
```

## 🎨 Customization

### Project Categories

Categories define how projects are organized and opened:

```typescript
{
  name: "React",           // Display name
  folderName: "React",     // Folder name in projects directory
  imagePath: "⚛️",         // Icon for the category
  defaultAppPath: "/Applications/Cursor.app",  // Default application
  type: "command",         // Template type
  autoCreateRepo: true     // Auto-create GitHub repos
}
```

### Project Settings

Each project can have individual settings:
- **Initial Version**: Starting version for releases (default: "1.0.0")
- **Custom configurations per project**

## ⌨️ Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `⌘ + O` | Open project |
| `⌘ + C` | Open in Cursor |
| `⌘ + T` | Open in Terminal |
| `⌘ + L` | Open in Claude Code |
| `⌘ + R` | Open GitHub repository |
| `⌘ + G` | Push to GitHub |
| `⌘ + ⇧ + G` | Pull from GitHub |
| `⌘ + N` | Rename project |
| `⌘ + E` | Edit aliases |
| `⌘ + S` | Edit project settings |
| `⌘ + D` | Delete git repository |

## 🔍 MCP Tools Integration

The extension provides MCP (Model Context Protocol) tools for AI assistants:

### Available Tools

- `getCategories`: Retrieve all project categories
- `getAllProjects`: Get list of all projects
- `openProject`: Open a specific project
- `createProject`: Create new projects
- `createProjectWithPrompt`: Create projects with AI assistance
- `checkIfGithubRepo`: Verify GitHub repository status
- `launchRepo`: Open GitHub repositories
- `createRepo`: Create new GitHub repositories
- `getAllCoolifyProjects`: List Coolify projects
- `getAllCoolifyApps`: List Coolify applications
- `createCoolifyProject`: Create Coolify projects
- `getAllCoolifyServers`: List Coolify servers
- `getAllTemplates`: Get available templates
- `createTemplate`: Create new templates
- `openTerminal`: Open terminal for projects

### AI Assistant Integration

These tools allow AI assistants to:
- Help create and manage projects
- Provide intelligent project suggestions
- Automate project setup workflows
- Integrate with development workflows

## 🚀 Advanced Workflows

### Rapid Project Creation Workflow

1. **Idea to Project in Seconds:**
   - Use "Create Project" with AI description
   - AI generates detailed PRD
   - Template sets up complete project structure
   - GitHub repository created automatically
   - Ready to start coding immediately

2. **Template-Based Development:**
   - Create templates for common project types
   - Include setup scripts for dependencies
   - Standardize project structures across teams

3. **Cross-Platform Development:**
   - SwiftUI projects auto-detected and opened in Xcode
   - Web projects opened in preferred editors
   - Terminal access for command-line operations

## 🎯 Best Practices

### Organization Tips

1. **Category Structure**: Organize by technology stack (React, Vue, Node.js, Python, etc.)
2. **Naming Conventions**: Use descriptive project names
3. **Aliases**: Add relevant aliases for easier searching
4. **Templates**: Create templates for frequently used project types

### Workflow Optimization

1. **Keyboard Shortcuts**: Learn the shortcuts for maximum efficiency
2. **Project Descriptions**: Always add descriptions for AI-generated PRDs
3. **Git Integration**: Use auto-repository creation for new projects
4. **Regular Updates**: Keep projects updated with pull operations

## 🐛 Troubleshooting

### Common Issues

**Projects not appearing:**
- Verify projects folder path in settings
- Ensure projects are in category subfolders
- Check folder permissions

**Git operations failing:**
- Verify GitHub CLI is installed (`gh --version`)
- Ensure proper git configuration
- Check authentication status (`gh auth status`)

**Template creation issues:**
- Verify template paths exist
- Check command syntax for command templates
- Ensure placeholder syntax is correct

**Coolify integration problems:**
- Verify API token and URL in settings
- Check network connectivity to Coolify instance
- Confirm API token permissions

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

This extension is actively maintained. For feature requests or bug reports, please contact the developer or submit issues through the appropriate channels.

---

*This extension represents over a year of development and real-world usage, designed to streamline the development workflow for programmers who manage multiple projects daily.*