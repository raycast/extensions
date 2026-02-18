# Local Agent Skills Browser (Raycast Extension)

Browse, search, and preview locally installed agent skills for Claude Code, Cursor, Codex, and many other coding agents.

## What It Does

- Scans known local skills directories for popular coding agents.
- Deduplicates skills that appear in multiple agent directories.
- Groups results by Universal, Agent-specific, and System skills.
- Shows `SKILL.md` content in Raycast detail view.
- Lets you open files in your editor/Finder and copy paths/content.

## Privacy

This extension only reads local files on your machine. It does not send your skill files to any external server.

## Development

Requirements:

- Node.js 20+ (or the version supported by Raycast tooling)
- Raycast app installed

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Lint and build:

```bash
npm run lint
npm run build
```

## Publish to Raycast Marketplace

```bash
npx @raycast/api@latest login
npm run publish
```

Publishing is interactive for public (free) marketplace extensions and will guide you through the PR flow.

## License

MIT
