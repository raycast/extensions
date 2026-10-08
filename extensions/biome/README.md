# Biome

Quickly search and browse Biome linter rules, releases, and documentation directly from Raycast.

## Features

### Search Biome Rules
- Browse all 381+ Biome linter rules with detailed information
- Filter by category (A11y, Complexity, Correctness, Nursery, Performance, Security, Style, Suspicious)
- View rule metadata: recommended status, fixable flag, and introduction version
- Sorted by version (newest rules first)
- Quick actions: copy rule name, copy rule ID, copy configuration snippet
- View detailed rule information with configuration examples
- Direct links to official Biome documentation

### Search Releases
- Browse all Biome releases with full changelogs
- View release details and GitHub links
- Quick access to version information

### Search Documentation
- Search through Biome's official documentation
- Quick access to guides and references

## How to Use

### Search Rules
1. Open Raycast and type "Search Biome Rules"
2. Browse all rules or use the search bar to filter
3. Use **Cmd+P** to filter by category
4. Press **Enter** on any rule to view detailed information
5. Use **Cmd+C** to copy the rule name
6. Use **Cmd+Shift+C** to copy the rule ID
7. Press **Cmd+R** to refresh the rules cache

### Browse Releases
1. Open Raycast and type "Search Releases"
2. Browse all Biome releases sorted by version
3. Press **Enter** to view full release notes
4. Click the GitHub link to view the release on GitHub

## Cache Management

The extension caches rule data for 24 hours to improve performance. To manually refresh:
- Open "Search Biome Rules"
- Press **Cmd+R** to clear cache
- Reopen the command to fetch fresh data

## Data Sources

- **Rules**: Fetched from Biome's official JSON schema (biomejs.dev/schemas)
- **Releases**: Fetched from GitHub API (github.com/biomejs/biome/releases)
- **Metadata**: Includes 381 rules with version tracking since v2.0.4

## Development

Built with:
- Raycast API v1.103.6
- TypeScript 5.8.2
- Bun runtime

### Scripts
```bash
bun run dev              # Development mode with hot reload
bun run build            # Build extension for distribution
bun run lint             # Run linting checks
bun run fix-lint         # Fix linting issues automatically
bun run build-versions   # Regenerate rule version mappings
```

### Data Generation
The extension includes scripts to regenerate rule data:
- `scripts/build-rule-versions.ts` - Fetches all Biome releases and generates version mappings
- `scripts/generate-fallback.ts` - Creates fallback data with proper versioning

## About Biome

[Biome](https://biomejs.dev) is a fast formatter and linter for JavaScript, TypeScript, JSX, JSON, and CSS. It's designed to be a performant alternative to Prettier and ESLint.

## License

MIT
