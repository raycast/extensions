# Raycast Skill Manager Plugin

A comprehensive Raycast extension to manage skills across multiple coding agents with a centralized architecture. Import skills from GitHub, sync them between agents, and create Raycast snippets—all from one unified interface.

## Features

## Architecture

**Central Skills Folder**: `~/agents/skills` (configurable)  
This is your **source of truth** for all skill files. Each skill is a folder containing a `SKILL.md` file.

**Codex Integration**: `~/.codex/skills` (configurable)  
Skills are symlinked to maintain compatibility with Codex and other agents.

### Commands

| Command                         | Description                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **List Skills**                 | Browse, search, and manage all skills. Supports creating Raycast snippets and copying skill text.   |
| **Add Skill**                   | Create a new skill or edit an existing one with a name, Markdown description, and optional tags.    |
| **Import Skill from GitHub**    | Import skill folders or SKILL.md files directly from GitHub repositories.                           |
| **Import GitHub Repo as Skill** | Transform a GitHub repository into a skill using `opensrc` and import it into the central folder.   |
| **Sync Skills**                 | Merge skills from agents into central and sync central skills to selected agents (including Codex). |
| **Manage Agents**               | View detected agents, skill folders, and their status across your system.                           |

### Supported Sync Targets

- **Codex** – `~/.codex/skills` (configurable)
- **Claude** – `~/.claude/skills`
- **Cursor** – `~/.cursor/skills`
- **VS Code** – `~/.vscode/skills`
- **Warp** – `~/.warp/skills`

## skills.md Format

```markdown
# Skills

## TypeScript

[tags: frontend, typing]
Use strict TypeScript. Prefer `unknown` over `any`. Always type function return values.

## TDD

[tags: testing, workflow]
Write tests before implementation. Use the red–green–refactor cycle.
```

Each skill starts with a level-2 heading (`##`). Tags are optional and follow the pattern `[tags: tag1, tag2]`.

## Raycast Snippets

Select a skill in the **List Skills** command and press **⌘S** to generate a Raycast snippet import deeplink. Paste the deeplink in your browser to instantly import the skill as a snippet with the keyword `!skill-name`.

## Preferences

| Preference            | Default           | Description                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------------- |
| `skillsFilePath`      | `~/skills.md`     | Absolute or `~`-relative path to your central skills file (legacy). |
| `centralSkillsFolder` | `~/agents/skills` | Central folder for skill files (source of truth).                   |
| `codexSkillsFolder`   | `~/.codex/skills` | Path to .codex/skills folder for Codex integration.                 |
| `githubToken`         | -                 | Optional GitHub Personal Access Token for private repositories.     |

## Workflow Examples

### Initial Setup

1. Run **Sync Skills** to copy existing skills from `~/.codex/skills` to `~/agents/skills`
2. Symlinks are automatically created to maintain compatibility

### Import New Skills

1. Use **Import Skill from GitHub** with URLs like:
   - `https://github.com/owner/repo/tree/main/skills/my-skill`
   - `owner/repo/path/to/skill` (shorthand)
2. Skills are downloaded to central folder and optionally linked to Codex

### Sync to Selected Agents

1. Run **Sync Skills**
2. Choose **Run Full Sync (Select Agents)**
3. Select your targets by checkbox (Codex included)
4. The command merges `agents -> central` and then links `central -> selected agents`

## Development

```bash
npm install
npm run dev     # Live-reload development
npm run build   # Production build
npm run lint    # Lint sources
```

## Security

- GitHub tokens are stored securely using Raycast's password preference type
- All file operations use proper path resolution and validation
- Symlinks are created safely with conflict detection
