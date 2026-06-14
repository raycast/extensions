# BubbleUsage

Raycast extension for local AI coding-agent usage.

Shows:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode
- connected/not connected state
- 5 hour, weekly, and monthly windows when agent supports them
- percent used when you set limits
- time left in each rolling window
- one-click login command in Terminal

No cloud API calls. Extension reads local CLI auth files and local usage/session logs.

## Use Locally

1. Install Raycast.
2. Install Node.js 22+.
3. From this folder, run `npm install`.
4. Run `npm run dev`.
5. Raycast opens extension in development mode.
6. Search Raycast or SuperCMD for `BubbleUsage`.
7. Open Raycast extension preferences and set token limits for each agent/window.
8. Use `Open Login in Terminal` action for any disconnected agent.

## Configure Paths

Use `Open Config File` action in Raycast. Default config lives in Raycast support folder. You can also set `Custom Config Path` in preferences.

Config shape:

```json
{
  "paths": {
    "claude": { "logs": ["~/.claude/projects"], "auth": ["~/.claude/.credentials.json", "~/.claude.json"] },
    "codex": { "logs": ["~/.codex/sessions"], "auth": ["~/.codex/auth.json"] },
    "gemini": { "logs": ["~/.gemini"], "auth": ["~/.gemini/oauth_creds.json"] },
    "opencode": { "logs": ["~/.local/share/opencode"], "auth": ["~/.config/opencode", "~/.local/share/opencode"] }
  },
  "limits": {
    "codex": { "fiveHour": 1000000, "weekly": 10000000 },
    "claude": { "fiveHour": 1000000, "weekly": 10000000, "monthly": 40000000 }
  }
}
```

Preference limits win by default. Config limits override preferences.

## Data Caveats

- Claude Code JSONL token fields can be approximate depending on version.
- Codex commonly has 5 hour and weekly windows, so monthly is hidden.
- Gemini CLI local log shape varies. Add custom log paths if your install stores usage elsewhere.
- OpenCode tries `opencode stats --json` first, then local logs.

## Submit To Raycast Store

1. Create GitHub repo for this extension.
2. Run `npm install`.
3. Run `npm run lint` and fix issues.
4. Run `npm run build`.
5. Update `author` in `package.json` to your Raycast username.
6. Add screenshots in Raycast style if Store review asks.
7. Fork `raycast/extensions` on GitHub.
8. Copy this folder into `extensions/bubbleusage` in your fork.
9. From Raycast extensions repo, run `npm install` if needed.
10. Run `npm run lint bubbleusage` or Raycast repo-specific lint command from current docs.
11. Commit changes.
12. Open PR to `raycast/extensions` with title `Add BubbleUsage extension`.
13. Answer review comments.
14. After merge, install from Raycast Store.

Alternative: run `npm run publish` and follow Raycast CLI prompts if your Raycast account is enabled for direct publishing.

Required local tools for PR submission:

- `git`
- GitHub account
- `gh` CLI authenticated with `gh auth login`, or a browser session where you can fork `raycast/extensions`
- Raycast username in `package.json` `author`
