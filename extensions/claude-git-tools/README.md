[English](README.md) | [中文](README.zh-CN.md)

# Claude Git Tools

Raycast extension for git automation via Claude Code CLI. Spawns background Claude processes to handle git-push, create-pr, and review-pr, streaming formatted output back to Raycast.

## Requirements

| Dependency | Required | Description |
|-----------|----------|-------------|
| [Raycast](https://raycast.com) | Yes | Hosts the extension |
| [Node.js](https://nodejs.org) + npm | Yes | Build the extension |
| `git` | Yes | Version control |
| [`claude`](https://docs.anthropic.com/en/docs/claude-code) | Yes | Claude Code CLI, must support `--output-format stream-json` |
| [`gh`](https://cli.github.com) | Recommended | Create PR and Review PR commands depend on it |
| [`terminal-notifier`](https://github.com/julienXX/terminal-notifier) | Optional | macOS notifications on task completion, with clickable PR/commit links |

All CLI tools must be in PATH.

## Getting Started

### 1. Install

```bash
cd extensions/claude-git-tools
npm install
npm run dev
```

### 2. Manage Folders & Skills

Run **Manage Folders & Skills** in Raycast:

- **Folders**: Add parent directories containing git repos (e.g. `~/git`). The extension scans up to 3 levels deep for `.git`.
- **Skills**: Optionally bind a `.md` skill file to each command (Git Push / Create PR / Review PR) as a system prompt. Without a skill file, the extension falls back to built-in slash commands (`/git-push-changes`, `/create-pr`, `/pr-review`).

### 3. Run a Command

| Command | Flow |
|---------|------|
| **Git Push** | Select repo → Task detail panel (Claude stages, commits, pushes) |
| **Create PR** | Select repo → Type or select target branch → Task detail panel (Claude creates PR) |
| **Review PR** | Select repo → PR list → Select a PR → Task detail panel (Claude reviews) |

Tasks run as detached background processes. The task detail panel streams real-time output. Closing Raycast does not interrupt running tasks.

### 4. View Tasks / Manage Model

- **View Tasks** — list all running and completed tasks, click to view output and extracted URLs
- **Manage Model** — switch between Haiku / Sonnet / Opus

## Claude CLI Permissions

The extension invokes `claude` with `--allowedTools` to pre-approve specific tools, avoiding interactive prompts in the background process.

| Tool | Reason |
|------|--------|
| `Bash(git:*)` | All git operations — add, commit, push, diff, log, branch, merge, rebase, etc. |
| `Bash(gh:*)` | GitHub CLI — `gh pr create`, `gh pr list`, `gh pr merge`, `gh pr close`, etc. |
| `Bash(ls:*)` | List directory contents to explore repo structure |
| `Bash(cat:*)` | Read file contents for diff context and commit message generation |
| `Bash(find:*)` | Discover files and directories within the repo |
| `Bash(grep:*)` | Search file contents for patterns during code review |
| `Bash(mkdir:*)` | Create directories when needed by git operations |
| `Bash(cp:*)` | Copy files during branch or merge operations |
| `Bash(wc:*)` | Count lines/words for change summary statistics |
| `Read` | Claude built-in file reading |
| `Write` | Claude built-in file writing |
| `Edit` | Claude built-in file editing |
| `Grep` | Claude built-in content search |
| `Glob` | Claude built-in file pattern matching |

## Skill File Format

Custom skill files (`.md`) receive user input via `$ARGUMENTS=<value>`. Skills must handle this input and produce specific output for notifications and in-app links to work.

### Arguments

| Command | `$ARGUMENTS` | Format |
|---------|-------------|--------|
| **git-push** | _(none)_ | Fixed instruction, no arguments |
| **create-pr** | `<branch>` | Single branch (`main`) = target branch; space-separated (`dev main`) = `{branchFrom} {branchTo}` |
| **review-pr** | `<pr-url>` | Full PR URL, e.g. `https://github.com/owner/repo/pull/123` |

The branch input comes from the branch picker UI (type new or select from history), passed directly as `$ARGUMENTS`.

### Required Output: Git URLs

The extension extracts URLs from Claude's output for clickable `terminal-notifier` notifications and in-app link actions. Missing URLs = notification fires without a clickable link.

| Command | Expected URL | Example |
|---------|-------------|---------|
| **git-push** | Commit URL | `https://github.com/owner/repo/commit/abc1234` |
| **create-pr** | PR URL | `https://github.com/owner/repo/pull/42` |

Supported platforms: GitHub, GitLab, Bitbucket. SSH remotes are auto-converted to HTTPS.

### Required Output: Review Report (review-pr only)

For the Review PR command, the extension extracts a report preview from Claude's output using the `!--------!` delimiter. The skill must wrap the final review report between two `!--------!` markers. Content between the markers is displayed in the task detail panel as a formatted report preview.

Without the delimiters, the review output still displays as raw streaming text, but the structured report preview will not be available.

```
!--------!
## Review Summary
...report content...
!--------!
```

### Example: create-pr skill

```markdown
Create a pull request.

Parse `$ARGUMENTS` as branch input:
- Two values separated by space (e.g. `dev main`): source branch + target branch
- Single value (e.g. `main`): current branch as source, the value as target

Steps:
1. Stage and commit uncommitted changes
2. Push source branch to remote
3. Create PR via `gh pr create`
4. Output the PR URL (e.g. https://github.com/owner/repo/pull/123)
```

## Screenshots

| Git Push | Create PR | Review PR |
|----------|-----------|-----------|
| ![Git Push](media/git_push.png) | ![Create PR](media/create_pr.png) | ![Review PR](media/review_pr.png) |

| Manage Folders & Skills | Task Detail |
|------------------------|-------------|
| ![Manage Folders](media/manage_folders.png) | ![Task Detail](media/task_detail.png) |

## Development

```bash
npm install
npm run build       # ray build
npm run dev         # ray develop (watch mode)
npm run lint        # ray lint
npm run fix-lint    # ray lint --fix
```

## License

MIT
