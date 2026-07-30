# Hermes Agent Cheatsheet

A comprehensive Raycast extension for browsing, searching, and copying
[Hermes Agent](https://github.com/NousResearch/hermes-agent) commands.

## Features

- 250+ searchable entries sourced from the official Hermes Agent documentation
- Complete documented top-level CLI command catalog
- Complete documented interactive slash-command catalog
- Installation and first-run recipes
- Keyboard shortcuts
- Models, providers, authentication, and configuration
- Tools, toolsets, skills, memory, gateway, cron, and MCP commands
- Frequently used environment variables and troubleshooting commands
- Inline, searchable examples with multiple copy-ready recipes for option-heavy commands
- Context-sensitive examples that follow the active search
- Favorites and recently used commands
- Consequence badges for caution, persistence, session scope, restarts, and deprecations
- Optional side-by-side detail preview and related-command discovery
- Preferences for model, provider, primary content, and preview behavior
- Enter for detailed explanations, `⌘ Enter` to copy, paste actions, and documentation links
- Category filter with per-category item counts

## Commands

### Hermes Agent Cheatsheet

Search all entries or filter by category. When an entry has concrete examples,
the example that best matches the search appears directly in the result list
and becomes the primary action. Additional recipes stay in an **Other
Examples** submenu so details and documentation remain easy to reach.

Favorite commands with `⌘ ⇧ F` on macOS or `Ctrl ⇧ F` on Windows; commands
copied, pasted, or opened are added to **Recently Used**. Toggle the side detail
preview with `⌘ ⇧ D` or `Ctrl ⇧ D`. Press `Enter` to open the selected command
details and `⌘ Enter` or `Ctrl Enter` to copy its active example or generic usage.

## Preferences

- Optional user-supplied model and provider pair for personalized examples; both are required for personalization and the extension does not assume defaults
- Primary content: Concrete Example or Generic Usage
- Show the detail preview when the cheatsheet opens

## Data freshness

The catalog is generated from the official Hermes Agent CLI and slash-command
reference pages. To update it from a local Hermes Agent checkout:

```bash
npm run sync-data -- --source /path/to/hermes-agent
```

Without `--source`, the script downloads the latest reference pages from the
official repository:

```bash
npm run sync-data
```

The generated catalog records the exact upstream commit used to create it.

## Development

```bash
npm install
npm run dev
```

Run the full validation suite:

```bash
npm run validate
```

## Sources

- [Hermes Agent repository](https://github.com/NousResearch/hermes-agent)
- [Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/)
- [CLI commands reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [Slash commands reference](https://hermes-agent.nousresearch.com/docs/reference/slash-commands)

## License

MIT
