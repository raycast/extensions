# Agent Ecosystem Map

Interactive map of your AI coding ecosystem. Discovers skills, agents, MCP servers, rules, and instructions configured across Claude Code, Codex CLI, Gemini CLI, Cursor, Windsurf, GitHub Copilot, and Continue.dev — all in one searchable view.

## Commands

- **Search Ecosystem** — Browse every discovered asset grouped by type
- **Skills** — Slash commands across Claude Code, Codex, and Gemini CLI
- **Agents** — Subagent definitions
- **MCP Servers** — Configured MCP servers grouped by transport (stdio, SSE, HTTP)
- **Rules** — Claude Code, Cursor, and Windsurf rules

## What it scans

The extension reads configuration files from standard locations:

- `~/.claude/` — commands, agents, rules, `CLAUDE.md`, `.mcp.json`
- `~/.codex/` — skills, agents, `instructions.md`, `mcp.json`
- `~/.gemini/` — skills, `GEMINI.md`, `mcp.json`
- `~/.continue/config.json`
- Project-level: `.cursor/rules/`, `.cursorrules`, `.windsurf/rules/`, `.windsurfrules`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`

No network requests are made. All scanning is read-only and local.

## Actions

For each asset:

- **Open File** — Open the source file in your default editor
- **Copy Path** (⌘⇧C) — Copy absolute file path
- **Copy Name** (⌘C) — Copy asset name
- **Show in Finder** (⌘⇧F)
