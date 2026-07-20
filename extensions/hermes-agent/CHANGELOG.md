# Changelog

## [Agent-Native Features] - {PR_MERGE_DATE}

- New Run Task command: submit an async agent run and watch it work.
  Live tool activity, streaming output, and approval handling when
  Hermes wants to run a flagged command. Approve once, for the session,
  always, or deny from the action panel.
- New Browse Skills command: list all installed Hermes skills by
  category, search by name or description, copy a skill name or a
  ready-to-paste `/skill` command.
- New Hermes Status menu bar command: live gateway status, active agent
  count, readiness checks, and connected platforms in the menu bar.
  Refreshes every 30 seconds.

## [Server-Side Sessions] - {PR_MERGE_DATE}

- Chat with Hermes now runs on server-side Hermes sessions instead of
  replaying LocalStorage history each turn. Conversations survive Raycast
  restarts, appear in `hermes sessions list`, and can be resumed from the
  CLI or desktop app.
- New Browse Sessions command: list sessions from every Hermes surface
  (CLI, desktop, messaging platforms, Raycast), continue any of them in
  Raycast, fork, rename, delete, or copy a `hermes --resume` command.
- Live tool activity during chat: see which tools Hermes is running
  (terminal, web search, file edits) while it works, streamed over SSE.
- Ask Hermes, Ask About Clipboard, and Process Selected Text now stream
  their responses and offer Continue in Chat, which picks up the same
  server-side session.
- API Server Status rebuilt on `/health/detailed` and `/v1/capabilities`:
  readiness checks, gateway state, connected platforms, active agent
  count, and advertised API features. The previous version rendered
  fields the basic `/health` endpoint never returned.
- Open Webchat: dashboard port is configurable, and the `hermes` binary
  is located across install styles (shell installer, Homebrew) instead of
  assuming `~/.local/bin`.
- Clearer errors: auth failures point at the token preference, HTTP 429
  explains the concurrent run limit, and streams that go silent are
  closed instead of hanging forever.

## [Initial Release] - 2026-05-05

- Initial release
- Ask Hermes: Quick question and answer
- API Server Status: Check Hermes API server connection status
- Open Webchat: Open Hermes dashboard in browser (auto-starts if not running)
