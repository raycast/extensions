# Skillset

Adds support for skills to Raycast AI.

@skillset makes any skill in a given directory available in Raycast AI Chat. The AI discovers, reads, and executes them on demand.

## Setup

1. Install the extension and open **Raycast Preferences → Extensions → Skillset**.
2. Set **Skills Directory** to your skills folder (e.g. `~/.agents/skills` or `~/.cursor/skills`).
3. Install skills. For example, use `npx skills add <skill-name>` in the terminal to install a skill.

## Usage

Tag `@skillset` in Raycast AI Chat.

- `Use @skillset brainstorm to help me explore this idea: <idea>` (uses a brainstorming skill)
- `What can you do? @skillset` (lists all skills)
- `@skillset Improve the following text: <text>` (uses an improve-writing skill)
- `Do a cleanup of my downloads folder @skillset @finder` (uses a download-cleanup skill and the finder extension)

### External Tools & Scripts

Raycast AI is sandboxed. If a skill requires an external tool (like executing code via `@shell` or sending email via `@mail`), you need to explicitly mention this Raycast tool in your chat.

## Creating a Skill

A skill is simply a folder with a markdown file.

**Structure:**

```text
~/.agents/skills/
└── git-commit/
    └── SKILL.md
```

Tip: You can use something like [skills.sh](https://skills.sh) to install skills. Use `npx skills add <skill-name> -g` in the terminal to install a skill.
