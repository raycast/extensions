# HeyClaude

Search [HeyClaude](https://heyclau.de) from Raycast and turn Claude agents, MCP servers, skills, hooks, rules, commands, guides, collections, statuslines, and AI jobs into usable actions.

HeyClaude is a curated, GitHub-native registry for Claude and AI workflow content. The extension brings the registry into Raycast so you can find useful entries, inspect the details, copy the right asset, and open canonical sources without leaving your keyboard.

## What You Can Do

- Search the full HeyClaude registry or open focused commands for agents, MCP servers, tools, skills, rules, commands, hooks, guides, collections, and statuslines.
- Browse active AI, Claude, MCP, and agent jobs with external employer apply links.
- Inspect entries with structured metadata for category, brand, source, trust, platform support, verification, and canonical URLs.
- Copy full assets, install commands, config snippets, Markdown links, summaries, and brand domains.
- Paste full assets directly into the focused app when that is the workflow you want.
- Create Raycast Quicklinks for registry entries, category pages, jobs, feeds, and common HeyClaude pages.
- Create Raycast Snippets from install commands and config snippets when an entry includes them.
- Favorite useful entries and jobs, with local frecency sorting that keeps repeated workflows easier to reach.
- Submit new content or suggest changes through HeyClaude and GitHub issue-first review flows.
- Open project links for the website, registry, API docs, feeds, jobs, newsletter, and GitHub repository.

## Commands

- `Search HeyClaude`: unified search across the registry.
- `Search Agents`: Claude agent entries.
- `Search MCP Servers`: MCP servers and config-oriented entries.
- `Search Tools`: AI tools and supporting services.
- `Search Skills`: reusable Agent Skill packages and guidance.
- `Search Rules`: reusable AI coding rules.
- `Search Commands`: slash-command style assets.
- `Search Hooks`: Claude Code hook assets.
- `Search Guides`: practical guides and reference content.
- `Search Collections`: curated bundles and workflows.
- `Search Statuslines`: Claude Code statusline configurations.
- `Browse HeyClaude Jobs`: active AI, Claude, MCP, and agent roles.
- `Submit New Content`: guided contribution form that opens reviewed submission URLs.
- `Get Involved with HeyClaude`: newsletter, GitHub, contribution, jobs, API, feeds, and support links.

## Read-Only by Design

The extension is intentionally read-only.

It does not request accounts, OAuth, GitHub tokens, API keys, local project-file access, or write access to your Claude/Cursor configuration. Contribution actions open browser URLs for reviewed HeyClaude or GitHub issue flows. They do not create pull requests, forks, branches, or registry entries from Raycast.

The extension can create Raycast-native Quicklinks and Snippets only when you explicitly trigger those Raycast actions.

## Data and Privacy

The extension reads public HeyClaude data:

- [Registry feed](https://heyclau.de/data/raycast-index.json)
- Per-entry detail JSON under `https://heyclau.de/data/raycast/...`
- [Jobs API](https://heyclau.de/api/jobs?limit=100)

Raycast `Cache` stores the latest successful registry feed, entry details, and jobs feed so the extension remains usable after a temporary network failure. Raycast `LocalStorage` stores your local favorites and local ranking signals. No analytics, accounts, tokens, or project-file data are used by the extension.

## Links

- Website: [heyclau.de](https://heyclau.de)
- Browse registry: [heyclau.de/browse](https://heyclau.de/browse)
- Submit content: [heyclau.de/submit](https://heyclau.de/submit)
- Jobs: [heyclau.de/jobs](https://heyclau.de/jobs)
- API docs: [heyclau.de/api-docs](https://heyclau.de/api-docs)
- GitHub: [JSONbored/claudepro-directory](https://github.com/JSONbored/claudepro-directory)

## Validation

```bash
npm run test:junit
npm run lint
npm run build
```
