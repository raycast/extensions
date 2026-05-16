# Superhuman Skills (Raycast)

Multi-step workflow prompts that chain Superhuman's MCP tools into named, reusable operations. Skills are what make the MCP feel like an assistant rather than a tool surface.

Each skill is a self-contained `SKILL.md` with frontmatter declaring the tools it uses and whether it writes to your account.

## How they're surfaced

### In Raycast

Each skill is registered as a Raycast command (e.g. **Morning Briefing**, **End-of-Day Wrap-up**). Invoke from Raycast root; the command shows the skill prompt and a one-keystroke action to copy it to your clipboard so you can paste it into Quick AI alongside `@superhuman`.

### In Claude Code / other MCP clients

These `SKILL.md` files match Superhuman's official Skills Library format. Any MCP client that supports skills (Claude Code, Cursor, etc.) can load them directly from this directory.

## Bundled skills

| Skill | Purpose | Writes? |
|---|---|---|
| `morning-briefing` | Overnight inbox triage + today's calendar | no |
| `eod-wrapup` | End-of-day summary + tomorrow's calendar | no |
| `meeting-scheduler` | Resolve participants → availability → invite | yes |
| `deal-tracker` | Cross-source view of a deal/customer | no |
| `batch-draft-writer` | Generate drafts across many threads from one prompt | yes |

## Read-only mode

Skills with `read_only: false` in frontmatter check the extension's read-only-mode preference at runtime and surface a notice if write actions are blocked. This matches the per-tool gating used by `draft-email`, `send-draft`, etc.

## Upstream sync

These skills are kept in sync with Superhuman's official upstream library at https://github.com/superhuman/mcp-mail/tree/main/skills. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the sync process.

Run `npm run sync-skills` to pull the latest upstream content; a weekly GitHub Action does the same automatically.
