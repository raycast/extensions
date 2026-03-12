# Gantry

A Raycast extension for managing macOS launchd services — view, run, edit schedules, and tail logs.

## Install

Install Gantry from the Raycast Store by searching for "Gantry" in Raycast.

For development, follow the steps in the "Development" section below.

## Features

- Browse all launchd services grouped by source (User Agents, System Agents, System Daemons)
- Filter by health status (healthy, error, warning, unknown)
- Inline detail panel with job metadata and recent logs
- Run jobs on demand with confirmation
- Edit cron schedules with live preview (user agents only)
- Natural language schedule input (e.g. "every weekday at 9am")
- AI-powered log summaries and schedule parsing (optional)
- Live tail logs with polling or open in Terminal
- Toggle Apple (`com.apple.*`) service visibility

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | View full job detail |
| `Cmd+R` | Run job now |
| `Cmd+E` | Edit schedule (user agents) |
| `Cmd+L` | View logs |
| `Cmd+Shift+L` | Live tail logs |
| `Cmd+Shift+A` | Toggle Apple services |
| `Cmd+Shift+R` | Refresh job list |
| `Cmd+C` | Copy job label |
| `Cmd+Shift+C` | Copy plist path |
| `Cmd+O` | Open plist in editor |

## Configuration

Open extension preferences to configure (in Raycast, select the Gantry command, open the action panel, and choose "Configure Extension"):

- **Show Apple Services** — include `com.apple.*` services in the list
- **AI Model** — choose an LLM for log summaries and natural language schedule parsing (Claude Haiku 4.5, Gemini 3 Flash, or GPT-5 Nano)
- **Anthropic API Key** — required for Claude models
- **Google API Key** — required for Gemini models
- **OpenAI API Key** — required for GPT models

AI features are optional. The extension works fully without any API keys configured.

### Setting up AI summaries

1. Open Gantry in Raycast and open the action panel
2. Select **Open Extension Preferences**
3. Choose an AI model from the **AI Model** dropdown
4. Enter the API key for your chosen provider in the corresponding field
5. Close preferences — AI summaries will now appear automatically in the detail panel when you select a job that has logs

## Development

```sh
npm run build    # Production build
npm run dev      # Development mode
npm run lint     # Lint check
npm run fix-lint # Auto-fix lint issues
```

## License

MIT
