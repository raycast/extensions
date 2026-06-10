# Claude Code Resume Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Resume any past Claude Code session (`claude -r <id>`), picked from your full session history with recall: Claude's auto title, the first prompt, the latest prompt, and the last reply.
- Open a recent project and start a new session or continue the last one (`--continue`).
- Works on macOS (Terminal.app, iTerm2, or Ghostty) and Windows — both WSL and native PowerShell sessions are auto-detected and relaunched in the right environment.
- Sessions always open as interactive `claude` in your real login shell, so your full dev environment (mise, node, npx for MCP) is available.
