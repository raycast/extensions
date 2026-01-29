# Graphite ↔ GitHub PR Converter

A Raycast extension that converts PR URLs between Graphite and GitHub for the same repo/PR.

## Commands

| Command | Description |
|---------|-------------|
| **Graphite → GitHub (Copy)** | Convert a Graphite PR URL to GitHub and copy to clipboard |
| **Graphite → GitHub (Open)** | Convert a Graphite PR URL to GitHub and open in browser |
| **GitHub → Graphite (Copy)** | Convert a GitHub PR URL to Graphite and copy to clipboard |
| **GitHub → Graphite (Open)** | Convert a GitHub PR URL to Graphite and open in browser |

## Usage

1. Copy a PR URL (Graphite or GitHub) to your clipboard, or select it in any app
2. Open Raycast and run the appropriate conversion command
3. The converted URL will be copied to clipboard or opened in your browser

The extension automatically detects URLs from:
1. Currently selected text
2. Clipboard contents
3. Manual input (fallback)

## Preferences

| Preference | Default | Description |
|------------|---------|-------------|
| Graphite Host | `https://app.graphite.dev` | For self-hosted Graphite instances |
| GitHub Host | `https://github.com` | For GitHub Enterprise |
| Enable Allowlist | Off | Only convert links for specific orgs/repos |
| Allowed Orgs/Repos | (empty) | Comma-separated list (e.g., `myorg,otherorg/specific-repo`) |

## Test Cases

### Graphite → GitHub

| Input | Expected Output |
|-------|-----------------|
| `https://app.graphite.dev/github/pr/facebook/react/12345` | `https://github.com/facebook/react/pull/12345` |
| `https://app.graphite.dev/github/pr/facebook/react/12345/some-slug` | `https://github.com/facebook/react/pull/12345` |
| `https://app.graphite.dev/github/pr/facebook/react/12345?tab=overview` | `https://github.com/facebook/react/pull/12345` |

### GitHub → Graphite

| Input | Expected Output |
|-------|-----------------|
| `https://github.com/facebook/react/pull/12345` | `https://app.graphite.dev/github/pr/facebook/react/12345` |
| `https://github.com/facebook/react/pull/12345/` | `https://app.graphite.dev/github/pr/facebook/react/12345` |
| `https://github.com/facebook/react/pull/12345?diff=unified` | `https://app.graphite.dev/github/pr/facebook/react/12345` |
| `https://github.com/facebook/react/pull/12345#discussion_r123` | `https://app.graphite.dev/github/pr/facebook/react/12345` |

### Edge Cases Handled

- Trailing slashes: Stripped and handled correctly
- Query parameters: Ignored during parsing
- URL fragments: Ignored during parsing
- Graphite slugs: Optional, ignored during conversion
- Mixed-case org/repo: Preserved as-is

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start the extension in development mode
4. The extension will appear in Raycast
