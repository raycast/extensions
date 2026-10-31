# Repository Manager

A Raycast extension for macOS and Windows for managing all your local Git repositories with detailed statistics, Git operations, and project management features.

## Features

### Repository Management
- **Project Discovery**: Automatically finds and lists all Git repositories in your configured directories
- **Project Details**: View comprehensive information about each repository
- **Quick Actions**: Open projects in your preferred editor, terminal, or browser
- **Favorites**: Mark frequently used repositories as favorites for quick access

### Git Statistics
- **Repository Overview**: View total commits, branches, and tags
- **Contributor Analysis**: See top contributors with commit counts
- **Code Statistics**: Detailed code analysis with language breakdown (requires tokei)
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
- **tokei**: For detailed code statistics and language analysis
  - **macOS**: `brew install tokei`
  - **Cargo**: `cargo install tokei`

## Windows Setup

1. Install [Git for Windows](https://gitforwindows.org/) with Git available from the command line, then restart Raycast if you changed PATH.
2. Choose your projects folder (for example `C:\Users\YourName\dev` or `D:\Projects`). The default `~\dev` resolves to your home directory.
3. Select your installed editor, terminal, and browser in extension preferences. Windows defaults are Visual Studio Code, Windows Terminal, and Microsoft Edge.
4. Supported Windows terminals are Windows Terminal, Windows PowerShell, PowerShell 7, and Command Prompt. For Windows Terminal, keep its `wt.exe` app execution alias enabled and select a native Windows default profile. Each opens in the repository directory.
5. For optional code statistics, install [tokei](https://github.com/XAMPPRocky/tokei) using `cargo install tokei` or the Windows binary from its releases, and ensure it is on PATH. Cargo's default bin directory is included automatically.

Project scripts require their detected runner (`npm`, `pnpm`, `yarn`, `bun`, `make`, `just`, or `task`) to be installed and available on PATH. Commands run using native Windows tools; WSL repositories and Linux tools are outside this extension's Windows support.

Shortcuts use Ctrl on Windows where macOS uses Command, and Alt where macOS uses Option. The reveal action uses File Explorer. Automatic editor window resizing is available on macOS only.

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
Since the extension performs extensive file system operations, enable project caching in extension preferences to improve performance. The cache can be manually cleared using the "Clear Cache" command (`⌘` + `⇧` + `⌫` on macOS, `Ctrl` + `Shift` + `Backspace` on Windows).

### Window Management
On macOS, enable window resizing/positioning in extension preferences for automatic window management when opening projects (works with editor windows).

## Git Statistics Features

### Code Statistics (tokei integration)
When tokei is installed, you get detailed analysis including:
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
2. For code statistics, install tokei using your preferred method
3. Configure your preferred editor and terminal in Raycast settings
4. Enable caching for better performance with large numbers of repositories


## Development and Validation

Use Node.js 22.22.2 or newer. Run `npm ci`, `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test`.

The automated tests cover native paths, process environments, shortcuts, terminal launch arguments, real Git operations, and package scripts. Set `REPOSITORY_MANAGER_TEST_ALL_RUNNERS=1` to also test installed pnpm, yarn, and bun runners; set `REPOSITORY_MANAGER_TEST_TOKEI=1` to test an installed tokei binary. Automated tests do not replace testing inside Raycast.

### Windows Raycast Smoke Test

- Discover repositories in the configured folder, including a path with spaces and an apostrophe; check grouping and displayed paths.
- Open a repository in the selected editor and each supported terminal; confirm the terminal's working directory is the repository.
- Open configured URLs and Git remote pages; confirm the selected browser is used for project URLs.
- Run Start Development with editor, terminal, and URLs; check that errors are reported if an app is missing.
- Run package scripts and installed Make/Just/Task targets; check output and failures.
- Check status, commit history, pull, and statistics with and without tokei.
- Check favorites, tags, recently opened projects, cache refresh/clear, and configuration editing.
- Verify Ctrl/Alt shortcuts, File Explorer reveal actions, and that editor resizing does not run on Windows.
