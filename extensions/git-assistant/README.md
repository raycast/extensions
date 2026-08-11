# Git Assistant

A Raycast extension that enhances your Git workflow with AI-powered features and convenient tools.

## Features

### 🔍 Search Git Repositories
- Search and navigate through your Git repositories quickly
- View repository status and recent changes

### 🤖 AI-Powered Commit Messages
- Analyze your changes and generate meaningful conventional commit messages
- Support for both staged and unstaged changes
- Follows the Conventional Commits specification
- Options to include/exclude scope and description

### 🛠️ Git Operations
- Create commits with AI-suggested messages
- Stage all changes or work with already staged changes
- Execute custom git commands with repository context

## Tools

The extension includes several specialized tools:

- `get-current-directory`: Detects the current working directory and Git repository status
- `get-git-changes`: Retrieves detailed information about repository changes (staged, unstaged, and untracked)
- `commit-changes`: Creates Git commits with proper confirmation
- `run-git-command`: Executes Git commands in the repository context
- `get-current-branch`: Retrieves the name of the current Git branch
- `get-git-branches`: Lists local and remote branches with optional filtering
- `create-branch`: Creates a new branch, optionally based on another branch, and switches to it
- `checkout-branch`: Switches to an existing branch using `git switch` with safe name escaping
- `get-git-status-summary`: Shows a concise repository status, including branch tracking and file state summary
- `get-git-log`: Retrieves commit history with optional limits and date filtering
- `show-commit`: Displays detailed information and patch for a specific commit
- `revert-commit`: Reverts a specific commit, with support for staging changes without committing
- `get-git-diff-staged`: Shows diffs for staged changes
- `get-git-diff-unstaged`: Shows diffs for unstaged changes
- `get-git-diff-target`: Compares the current state against a target branch or revision with configurable context
- `stage-files`: Adds specific files to the Git index
- `unstage-files`: Removes specific files from the Git index without discarding working tree changes
- `reset-staged`: Unstages all currently staged changes in the repository
- `pull-current-branch`: Updates the current branch from its remote, using fast-forward only by default
- `push-current-branch`: Pushes the current branch to its remote and configures upstream when needed

## Usage

1. **Search Repositories**
   - Use the "Search Git Repositories" command to find and navigate your repositories

2. **Create AI-Powered Commits**
   - Stage your changes using Git
   - Use the extension to analyze changes and generate a commit message
   - Review and confirm the commit

3. **Custom Git Commands**
   - Execute any Git command directly through the extension
   - Maintains proper repository context

## Contributing

Feel free to open issues or submit pull requests to improve the extension.