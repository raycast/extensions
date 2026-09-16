# Ray Tools

A small Raycast extension for focused, independent tools that make everyday work faster.

> Early-stage project. The extension is useful today, but the API and feature set may evolve.

## Features

### Translate Text

Translate selected text, clipboard contents, or text entered directly in Raycast. Russian and English are detected automatically and the direction is switched:

- `ru → en`
- `en → ru`

### Proofread Russian Text

Check Russian spelling and punctuation in selected text, clipboard contents, or text entered directly in Raycast. The command shows each suggestion and a corrected version that can be copied or pasted.

### Clean Markdown

Remove common Markdown formatting from selected text, clipboard contents, or text entered directly in Raycast. Bold and italic markers, links, headings, quotes, lists, task markers, code fences, and inline code are converted into readable plain text that can be copied or pasted.

### Ping

Keep a menu-bar network status visible with a background check every 60 seconds. Ping checks the local router (macOS default gateway), packet loss to the internet host behind Google's HTTP 204 connectivity endpoint, a configurable HTTPS remote endpoint (default: `https://example.com`), and detectable macOS VPN activity. Its diagnosis is deliberately layered: it distinguishes likely local-network, ISP/internet-path, remote-server, and VPN problems, while showing `Inconclusive` when the probes do not prove a layer. A separate action runs macOS `networkQuality` for an explicit download-speed test of up to 8 seconds.

## Privacy and configuration

- Translation text is sent over HTTPS to Google's public translation endpoint.
- Russian proofreading text is sent over HTTPS to LanguageTool's public API.
- Markdown cleaning runs locally and does not send text to a provider.
- Ping sends only connectivity requests: five ICMP echoes to the local default gateway, five ICMP echoes to the internet host, and HTTPS requests to the configured public endpoints. The optional speed test uses macOS `networkQuality` and transfers test traffic. It does not send user text, credentials, or request data to those endpoints.
- The extension does not persist translation history or store user text locally.
- Ping keeps its current result in Raycast's running menu-bar command only; it does not persist the local gateway address or probe history.
- The current providers do not require an API key or any environment variables.
- Do not put credentials into source code or a `.env` file and assume they are hidden. A Raycast extension is client-side code, so a secret bundled into it can be extracted. An authenticated provider should use Raycast keychain-backed preferences or a server-side proxy instead.

Do not send confidential or regulated data through the current public providers.

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- Node.js 22.22.2+ and npm for development

## Local development

```bash
npm ci
npm run check
```

Run the extension in Raycast while developing:

```bash
npm run dev
```

The `check` script runs the complete local quality gate:

1. unit tests;
2. TypeScript type checking;
3. ESLint and Prettier through Raycast's linter;
4. a production extension build.

## Architecture

Each tool lives under `src/tools/<tool-name>` and is split into:

- **domain** — pure language and request/response rules, with no Raycast imports;
- **providers** — external integrations behind a small interface;
- **UI command** — the Raycast adapter in `src/commands`.

Shared infrastructure belongs in `src/shared`. New tools should add their own directory and manifest command without importing another tool's UI or provider. This keeps tools independently replaceable and makes it possible to add another translation backend without changing the user flow.

## Translation backend

The first version uses Google's public translation endpoint with automatic source-language detection. The endpoint is isolated behind `TranslationProvider`, so it can be replaced with an authenticated or self-hosted provider later without changing the user flow.

The public endpoint may be rate-limited or change without notice. It is intentionally treated as a replaceable provider rather than a guaranteed production API.

## Russian proofreading backend

The Russian proofreading command uses LanguageTool's public `/v2/check` endpoint with the `ru-RU` language. It checks spelling, punctuation, grammar, and style rules, then applies the first suggestion for each non-overlapping issue to create the copyable corrected text. A small local Russian rule supplements the provider for context-sensitive spelling such as `не интересно` → `неинтересно` when there is no explicit negation or contrast.

The public endpoint may be rate-limited or change without notice. Text sent to it should not contain confidential or regulated data.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and pull request expectations. Ideas and planned improvements are tracked in [IDEA.md](IDEA.md).

## Security

Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability. Never publish credentials, private keys, personal data, or confidential translation samples in an issue.

## License

This project is released under the [MIT License](LICENSE).
