# Agent Rules

A repository containing rules and commands for AI coding agents, formatted using the [Rulesync](https://github.com/dyoshikawa/rulesync) standard. This allows for cross-platform compatibility across different AI coding assistants (Cursor, Claude Code, Codex CLI, etc.).

## Structure

- **`rules/`** - Rule files that define behavior and guidelines for AI coding agents
- **`commands/`** - Command files that provide reusable instructions for common tasks
- **`mcp.json`** - MCP (Model Context Protocol) server configuration

## Installation as Git Submodule

To use this repository as a shared ruleset across multiple projects, add it as a git submodule under the `.rulesync` directory of your target repository.

### Step 1: Add the Submodule

From the root of your target repository, run:

```bash
git submodule add https://github.com/OzTamir/agent-rules.git .rulesync
```

Or using SSH:

```bash
git submodule add git@github.com:OzTamir/agent-rules.git .rulesync
```

### Step 2: Initialize and Update Submodules

If you're cloning a repository that already has this submodule, initialize it with:

```bash
git submodule update --init --recursive
```

### Step 3: Use with Rulesync

Once the submodule is in place, you can use [Rulesync](https://github.com/dyoshikawa/rulesync) to generate platform-specific configurations:

```bash
# Install rulesync globally (if not already installed)
npm install -g rulesync

# Generate configurations for your target platforms
rulesync generate --targets cursor,claudecode
```

Rulesync will automatically discover and use the rules and commands from the `.rulesync` directory.

### Step 4: Configure Gitignore

After generating configurations, use Rulesync's gitignore functionality to automatically add generated files to your `.gitignore`:

```bash
rulesync gitignore
```

This command automatically appends the paths of all Rulesync-generated files (like `.cursorrules`, `CLAUDE.md`, etc.) to your `.gitignore` file, ensuring they are excluded from version control. This keeps your repository clean and prevents conflicts with generated files.

### Updating the Submodule

To update the rules to the latest version:

```bash
cd .rulesync
git pull origin main
cd ..
git add .rulesync
git commit -m "Update agent-rules submodule"
```

Or from the repository root:

```bash
git submodule update --remote .rulesync
git add .rulesync
git commit -m "Update agent-rules submodule"
```

## Usage

The rules in this repository are automatically applied when using Rulesync-compatible AI coding assistants. Each rule file includes frontmatter metadata that specifies:

- Which platforms it targets (`targets`)
- Which files it applies to (`globs`)
- Whether it's a root rule (`root`)
- Platform-specific settings

## Contributing

To add or modify rules:

1. Edit the appropriate file in `rules/` or `commands/`
2. Follow the Rulesync format with proper frontmatter
3. Commit and push changes
4. Update the submodule in projects that use it

## References

- [Rulesync Documentation](https://github.com/dyoshikawa/rulesync)
- [Rulesync Format Specification](https://github.com/dyoshikawa/rulesync#rulesync-format)
