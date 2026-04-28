# Agent Usage

Track usage across your AI coding agents in one place.

![Agent Usage Screenshot](metadata/agent-usage-1.png)
![Agent Usage Screenshot](metadata/agent-usage-5.png)

## Features

- **Multi-Agent Support** - View usage for Amp, Claude, Codex, Copilot, Droid, Gemini, Kimi, Antigravity, Synthetic, and z.ai (GLM)
- **Multi-Account Support** - Manage multiple API keys per provider with named accounts ("Work", "Personal", etc.)
- **Quick Overview** - See remaining quotas and usage at a glance with ASCII progress bars
- **Detailed Breakdown** - Expand each agent for full usage details
- **Menu Bar** - Quick overview from the menu bar with click-to-navigate
- **Zero Config** - Most agents are auto-detected from local credentials
- **OpenCode Integration** - Auto-detect credentials from OpenCode for supported providers, with visual indicator showing which account is currently active in OpenCode
- **Refresh & Copy** - Quickly refresh data or copy usage details to clipboard
- **Customizable** - Show/hide agents, reorder list, and configure display preferences

## Supported Agents

| Agent           | Data Source               | Manual Key | OpenCode | Env Var | Multi-Account | Setup                                                                                   |
| --------------- | ------------------------- | :--------: | :------: | :-----: | :-----------: | --------------------------------------------------------------------------------------- |
| **Amp**         | Local SQLite database     |     —      |    —     |    —    |       —       | Auto-detected from local database                                                       |
| **Claude**      | Anthropic OAuth Usage API |     —      |    ✓     |    —    |       —       | Auto-detected after `claude` login                                                      |
| **Codex**       | OpenAI API                |     ✓      |    —     |    —    |       ✓       | Run `codex login`, or paste token in preferences                                        |
| **Copilot**     | GitHub Copilot internal API |    —      |    —     |    ✓    |       —       | Auto-detected from `GH_TOKEN`/`GITHUB_TOKEN`, or paste token in preferences             |
| **Droid**       | Factory AI API            |     —      |    —     |    —    |       —       | Run `droid` command to login                                                            |
| **Gemini**      | Local state file          |     —      |    —     |    —    |       —       | Auto-detected from local state                                                          |
| **Kimi**        | Moonshot API              |     ✓      |    ✓     |    —    |       ✓       | Use OpenCode `kimi-for-coding`, or paste token from https://www.kimi.com/code/console   |
| **Antigravity** | Google API                |     —      |    —     |    —    |       —       | Auto-detected from local API                                                            |
| **Synthetic**   | Synthetic API             |     ✓      |    ✓     |    —    |       ✓       | Use OpenCode `synthetic`, or paste API key from https://synthetic.new/billing           |
| **z.ai (GLM)**  | Zhipu API                 |     ✓      |    ✓     |    ✓    |       ✓       | Paste token, use OpenCode `zai-coding-plan`, or set `ZAI_API_KEY`/`GLM_API_KEY` env var |

**Legend:**

- **Manual Key** — Enter API key/token directly in Raycast extension preferences
- **OpenCode** — Auto-detected from `~/.local/share/opencode/auth.json`
- **Env Var** — Auto-detected from shell environment variables
- **Multi-Account** — Support for multiple named accounts via "Manage Accounts" action (⌘M)

## OpenCode Active Indicator

When you have multiple accounts configured for a provider (e.g., multiple Kimi API keys), the extension shows a ⚡ bolt icon next to the account that is currently being used by OpenCode. This helps you identify which account is actively being consumed.

The indicator appears in:

- **List View** — Green bolt icon in the accessory area with tooltip "Currently used in OpenCode"
- **Menu Bar** — ⚡ prefix before the account name

This works by comparing your stored account tokens with the keys configured in `~/.local/share/opencode/auth.json`.

### Copilot Token

1. Use a GitHub OAuth token that the Copilot internal API accepts, such as the token from `gh auth token`
2. Standard personal access tokens may not work with `https://api.github.com/copilot_internal/user`
3. Set that token in `GH_TOKEN` or `GITHUB_TOKEN`; if Raycast doesn't inherit shell env, Agent Usage will resolve it from your login shell
4. Optional fallback: paste the same OAuth token in extension preferences (`Copilot Authorization Token`)

## Preferences

- **Visible Agents** - Toggle which agents to show in the list
- **Amp Display Mode** - Show remaining as amount or percentage
- **Agent Order** - Use `⌘⌥↑` / `⌘⌥↓` to reorder agents in the list

## Keyboard Shortcuts

| Shortcut | Action                                 |
| -------- | -------------------------------------- |
| `↵`      | Refresh usage data                     |
| `⌘C`     | Copy usage details                     |
| `⌘⇧C`    | Copy API key (multi-account providers) |
| `⌘M`     | Manage Accounts (multi-account)        |
| `⌘⌥↑`    | Move agent up                          |
| `⌘⌥↓`    | Move agent down                        |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Roadmap

More agents coming soon.

## License

MIT
