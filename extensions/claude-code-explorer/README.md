# Claude Code Explorer Raycast Extension

A Raycast extension for browsing and searching Claude Code plans and conversation history per project.

## Commands

### Browse Plans

Browse and search Claude Code plans from `~/.claude/plans/`. Shows a list of plans with markdown preview.

**Actions:**
- Copy path to clipboard
- Open in editor
- Show in Finder
- Delete plan

### Browse History

Browse Claude Code conversation history per project. Reads from `~/.claude/history.jsonl` and session files in `~/.claude/projects/`.

**Features:**
- Project filter dropdown (remembers last selection)
- Full conversation detail panel with user/assistant messages and tool usage
- Push into full conversation view

**Actions:**
- View full conversation (Enter)
- Copy `claude --dangerously-skip-permissions --resume <id>` (Cmd+Shift+R)
- Copy `claude --resume <id>` (Cmd+R)
- Copy session UUID (Cmd+.)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publishing to Raycast Store

### Prerequisites

1. Create a [Raycast account](https://raycast.com) if you don't have one
2. Log in via CLI:
   ```bash
   npm run login
   ```

### Publish

Run the full publish pipeline (lint + build + publish):

```bash
npm run publish
```

This will:
1. Lint the extension to verify manifest and code quality
2. Build the production bundle
3. Submit the extension to the Raycast Store for review

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build production bundle |
| `npm run lint` | Validate manifest and lint code |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm run login` | Log into Raycast account |
| `npm run publish` | Lint, build, and publish to Store |
