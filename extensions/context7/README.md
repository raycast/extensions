<img src="assets/extension-icon.png" width="128" height="128" alt="Context7 Icon" />

# Context7

Instantly search and browse up-to-date library documentation right from Raycast. Powered by [Context7](https://context7.com).

> ⚠️ **Disclaimer**: This is an unofficial community extension and is not affiliated with Upstash or Context7.

## Why Context7?

AI coding assistants often hallucinate outdated APIs and deprecated patterns. Context7 solves this by providing **current, version-specific documentation** for thousands of popular libraries.

With this extension, you can:

- 🔍 **Search** thousands of library docs instantly
- 📖 **Read** full documentation with beautiful markdown rendering
- 📋 **Copy** AI-optimized content (`llms.txt`) for your prompts
- ⭐ **Discover** popular libraries sorted by GitHub stars

## Usage

1. Open Raycast and search for **"Search Docs"**
2. Type any library name (e.g., `react`, `nextjs`, `tailwind`)
3. Browse results showing ⭐ stars, 📝 tokens, 📋 snippets, and 🕐 last update
4. Press `Enter` to view full documentation
5. Use the action menu for more options

## Actions

| Action | Shortcut | Description |
|--------|----------|-------------|
| View Documentation | `Enter` | View full documentation with markdown rendering |
| Open in Browser | `⌘ O` | Open the Context7 page in your browser |
| Open llms.txt Link | `⌘ L` | Open the AI-optimized documentation link |
| Copy llms.txt Content | `⌘ ⇧ C` | Copy documentation optimized for LLMs |
| Copy URL | `⌘ ⇧ U` | Copy the Context7 URL to clipboard |

## Configuration

| Preference | Description | Required |
|------------|-------------|----------|
| **API Key** | Your Context7 API Key for higher rate limits | No |
| **Default Tokens** | Token limit for documentation (default: 10000) | No |

### API Key

The extension works without an API key using anonymous access. For higher rate limits and better performance, you can obtain an API key from [Context7](https://context7.com).

## About Context7

[Context7](https://context7.com) is developed by [Upstash](https://upstash.com) and provides up-to-date, version-specific documentation and code examples optimized for AI models. It helps developers avoid outdated API references and ensures AI assistants generate accurate, current code suggestions.

## Links

- [Context7 Website](https://context7.com)
- [Context7 GitHub](https://github.com/upstash/context7)
- [Upstash Discord](https://upstash.com/discord)

## License

MIT
