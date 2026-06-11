# Codex Manager

Manage Codex MCP servers and skills with safe local operations.

## Commands
- **Codex: MCP Servers**: list and manage MCP entries in `config.toml` (create, edit, duplicate, import, validate, delete).
- **Codex: Skills**: create and manage skill folders and `SKILL.md` files (import ZIP supported).
- **Codex: Doctor**: report common config and skills issues with quick actions.

## Preferences
- **MCP Config Path**: path to `config.toml` (default `~/.codex/config.toml`).
- **Skills Folder**: path to `~/.codex/skills/`.
- **Preferred Editor**: open files with system default or `code`.
- **Args Format**: lines or JSON input.
- **Create Backup**: timestamped backups before writing.

## Import Examples
MCP JSON (bulk):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

MCP JSON (single):
```json
{
  "name": "playwright",
  "command": "npx",
  "args": ["-y", "@playwright/mcp"]
}
```

ZIP structure (either form is valid):
```text
my-skill.zip
├── SKILL.md
├── scripts/
│   └── setup.sh
└── notes.txt
```

```text
my-skill.zip
└── my-skill/
    ├── SKILL.md
    ├── scripts/
    │   └── setup.sh
    └── notes.txt
```
