<div align="center">
  <br/>
  <br/>
  <img src="./assets/icon.png" alt="fx Coding Agent" width="100"/>
  <h3>fx Coding Agent</h3>
  <p>Run fx, revisit sessions, and delegate coding work from Raycast</p>
  <br/>
  <br/>
</div>

fx Coding Agent is a Raycast extension for working with the [fx coding agent](https://fx.sh/) without losing the speed and context of Raycast. Search saved conversations, read complete session history, resume interactive work in Terminal, run noninteractive prompts, inspect local health and usage, or delegate coding tasks through Raycast AI.

## Features

- Search saved fx sessions across every workspace by title, preview, path, language, or session ID.
- Read the complete saved conversation instead of only the first-message preview.
- Resume, rename, record, recover, and inspect sessions from the action panel.
- Run `fx ask` in a selected workspace and continue an existing session by ID.
- Review health checks with clear passed, warning, and failed states.
- Explore token usage, request counts, spend, coverage, and per-model totals.
- Use Raycast AI tools to discover sessions, summarize previous work, and delegate confirmed coding requests.
- Install fx from an actionable error state when the executable is unavailable.

## Requirements

- macOS on Intel or Apple silicon
- [Raycast](https://www.raycast.com/)
- [fx](https://fx.sh/) installed locally

## Install fx

Install the latest fx release with the official installer:

```bash
curl -fsSL https://fx.sh/setup.sh | bash
```

The installer places fx in `~/.local/bin` and can add that directory to your shell `PATH`. To inspect the script before running it:

```bash
curl -fsSL https://fx.sh/setup.sh -o setup.sh
less setup.sh
bash setup.sh
```

Confirm that fx is ready:

```bash
fx --version
fx doctor
```

When fx is missing, the extension offers **Install Fx in Terminal**, **Copy Install Command**, and a link to the installation guide. Raycast asks for confirmation before opening Terminal with the installer.

## Install the extension from source

Clone this repository, install its dependencies, and start the Raycast development build:

```bash
npm ci
npm run dev
```

Raycast opens the extension after a successful development build. Keep the process running while making changes to enable hot reload.

## Configuration

Open the extension preferences in Raycast to configure these values:

| Preference            | Required | Default        | Purpose                                                                                                              |
| --------------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **fx Executable**     | Yes      | `fx`           | Command name or full path to the fx executable. Use `~/.local/bin/fx` when Raycast cannot resolve your shell `PATH`. |
| **Default Workspace** | No       | Home directory | Initial workspace for Health, Usage, Ask Fx, and Raycast AI tools when you do not provide one.                       |

## Commands

### Search Sessions

Search saved sessions from every fx workspace and inspect the complete conversation alongside its workspace, turn count, timestamps, language, and exact session ID.

Available actions include:

- **Resume Session** opens the exact conversation in Terminal.
- **Show Full Conversation** displays every saved user and assistant turn.
- **Rename Session** copies fx's supported `/rename <name>` command and opens the session for you to paste it.
- **Resume and Record Session** resumes with fx recording enabled.
- **Recover Session Copy** creates a recovered copy after confirmation and leaves the original session unchanged.
- **Inspect Session in Terminal** prints the underlying JSON response for troubleshooting.
- **Refresh Session Data** reloads the list and the currently selected saved conversation.

Large tool outputs are summarized by tool name and status so the transcript remains readable. Complete user and assistant messages are preserved.

### Ask Fx

Run a noninteractive `fx ask` request in a selected workspace. The result view shows the Markdown response, model, session ID, steps, token usage, and workspace.

Enter an optional **Resume Session ID** to continue an existing conversation. Copy the exact ID from **Search Sessions** rather than using a session title.

### Open Fx Session

Open fx in Terminal using one of three modes:

- **Start New Session** opens a fresh interactive session in the selected workspace.
- **Resume Latest Session** continues the most recent workspace session.
- **Open Session Picker** opens fx's interactive session picker.

### Check Fx Health

Combines `fx status --json` with `fx doctor --json` and presents the results as native Raycast details. Review the active model, authentication provider, permission mode, workspace, build information, and each local health check without reading raw JSON.

The original JSON report remains available through **Copy Health Report JSON** for diagnostics.

### View Fx Usage

Review locally recorded usage for the last 24 hours, 7 days, or 30 days. The command includes:

- Total requests, tokens, and spend
- Input and output tokens
- Cache read and cache write tokens
- Reasoning tokens when reported by fx
- Full or partial coverage indicators
- Usage grouped by model

Use **Copy Usage JSON** when you need the original machine-readable report.

## Raycast AI

The extension provides three tools to Raycast AI:

| Tool                   | What it does                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **List Fx Sessions**   | Finds real session IDs and summaries across one or all workspaces.                         |
| **Inspect Fx Session** | Reads the metadata and complete saved history of an exact session.                         |
| **Ask Fx**             | Delegates a coding request to fx in a specific workspace or continues an existing session. |

Try prompts such as:

- `@fx-coding-agent List my five most recent fx sessions.`
- `@fx-coding-agent Summarize what happened in my session about cache handling.`
- `@fx-coding-agent Continue session <session-id> and ask fx what remains unfinished.`
- `@fx-coding-agent Ask fx to run the focused tests in /Users/me/project and fix any failures.`

**Ask Fx** requires confirmation because fx may inspect or modify files in the selected workspace. The extension keeps fx's configured permission checks enabled and never adds `--yolo`.

## Troubleshooting

### `spawn fx ENOENT`

Raycast cannot find the executable in its environment. Find the installed path in Terminal:

```bash
command -v fx
```

Copy the returned path into **fx Executable** in the extension preferences. A typical value is:

```text
~/.local/bin/fx
```

If `command -v fx` returns nothing, install fx using the command in [Install fx](#install-fx).

### No sessions appear

Start an interactive fx session, complete at least one turn, then run **Refresh Session Data**. **Search Sessions** includes every workspace, while the fx session picker opened from **Open Fx Session** uses the selected workspace.

### A running session shows older content

fx exposes saved session history rather than a live stream of in-progress terminal output. Complete the current fx turn, then choose **Refresh Session Data** to load the latest saved history.

### fx returns unsupported or invalid JSON

Upgrade fx and try again. The extension validates the JSON shapes used by session, status, doctor, usage, and AI inspection features so incompatible CLI responses fail with a recovery message instead of rendering incorrect data.

## Privacy and permissions

- Session, health, and usage information comes from your local fx installation.
- The extension does not bypass fx's permission mode.
- Raycast confirms delegated AI requests before fx can inspect or modify a workspace.
- Session recovery requires confirmation and creates a copy rather than replacing the original.
- The installer action opens the official fx installer in Terminal only after confirmation.

## Development

Run the same checks used before publishing:

```bash
npm run fix-lint
npm run lint
npx tsc --noEmit
npm run build
npx ray evals
```

The AI evals verify session discovery, exact-session inspection, and confirmed coding delegation.

## Resources

- [fx installation guide](https://fx.sh/docs/getting-started/installation)
- [fx CLI reference](https://fx.sh/docs/using-fx/cli)
- [fx session guide](https://fx.sh/docs/using-fx/sessions)
- [fx ask guide](https://fx.sh/docs/using-fx/fx-ask)
- [fx usage and costs](https://fx.sh/docs/using-fx/usage-and-costs)
- [Raycast extension documentation](https://developers.raycast.com/)
