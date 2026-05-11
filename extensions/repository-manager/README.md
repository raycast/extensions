# Repository Manager

A comprehensive Raycast extension for managing all your local Git repositories with detailed statistics, Git operations, and project management features.

## Features

### Repository Management
- **Project Discovery**: Automatically finds and lists all Git repositories in your configured directories
- **Project Details**: View comprehensive information about each repository
- **Quick Actions**: Open projects in your preferred editor, terminal, or browser
- **Favorites**: Mark frequently used repositories as favorites for quick access

### Git Statistics
- **Repository Overview**: View total commits, branches, and tags
- **Contributor Analysis**: See top contributors with commit counts
- **Code Statistics**: Detailed code analysis with language breakdown (requires cloc)
- **Git Status**: Check working directory status and pending changes
- **Commit History**: Browse recent commits with details

### Git Operations
- **Status Monitoring**: Real-time working directory status
- **Branch Management**: View and work with repository branches
- **Remote Operations**: Quick access to GitHub, GitLab, Bitbucket, and other Git remotes
- **Commit Navigation**: Browse commit history and details

## Requirements

### Basic Requirements
- A valid Git repository (checks for `.git` folder presence)
- Git installed and accessible from command line

### Optional Requirements
- **cloc**: For detailed code statistics and language analysis
  - **macOS**: `brew install cloc`
  - **npm**: `npm install -g cloc`

## Configuration

Every project can have a customized configuration file (`.raycast/repository-manager.json`) in the project root to customize behavior:

```json
{
    "name": "Custom Project Name",
    "description": "Custom description shown in detail page",
    "urls": {
        "local": "{project}.test",
        "staging": "staging.{project}.com",
        "production": "{project}.com"
    },
    "dynamicUrlElements": [
        { "key": "project", "value": "custom-value" }
    ],
    "developmentCommand": {
        "apps": ["editor", "terminal"],
        "urls": ["{urls.local}", "{urls.staging}"]
    }
}
```

### Configuration Options

#### URLs
Define custom URLs for different environments. You can use placeholders like `{project}` which will be replaced with the project name or custom values.

#### Dynamic URL Elements
Override placeholder values with custom values:
- `key`: The placeholder name (without braces)
- `value`: The replacement value

#### Development Command
Configure what happens when you use the "Start Development" action:
- `apps`: Array of applications to open
  - `"editor"`: Opens in your default editor
  - `"terminal"`: Opens in your default terminal
- `urls`: Array of URLs to open in browser (optional)
  - Can reference URLs defined in the `urls` object using `{urls.keyname}`

### Examples

**Editor and Terminal only:**
```json
{
    "developmentCommand": {
        "apps": ["editor", "terminal"]
    }
}
```

**Editor with URLs:**
```json
{
    "developmentCommand": {
        "apps": ["editor"],
        "urls": ["{urls.local}", "{urls.staging}"]
    }
}
```

## Performance Features

### Projects Caching
Since the extension performs extensive file system operations, enable project caching in extension preferences to improve performance. The cache can be manually cleared using the "Clear Cache" command (`⌘` + `⇧` + `⌫`).

### Window Management
Enable window resizing/positioning in extension preferences for automatic window management when opening projects (works with editor windows).

## Git Statistics Features

### Code Statistics (cloc integration)
When cloc is installed, you get detailed analysis including:
- Lines of code by programming language
- Comment and blank line counts
- File counts per language
- Total project statistics

### Repository Metrics
- Total commit count across all branches
- Number of remote branches
- Tag count
- Top contributors with commit statistics

### Git Status Integration
- Working directory changes
- Staged files
- Untracked files
- Branch status and upstream information

## Supported Git Hosting Services

The extension provides quick access to:
- GitHub
- GitLab
- Bitbucket
- Gitness
- Any custom Git remote

## Installation Notes

1. Ensure Git is installed and accessible from your terminal
2. For code statistics, install cloc using your preferred method
3. Configure your preferred editor and terminal in Raycast settings
4. Enable caching for better performance with large numbers of repositories
