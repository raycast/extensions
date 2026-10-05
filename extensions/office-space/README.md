# Office Space for Raycast

Your coding agents and dev servers from Raycast. Needs [Office Space](https://github.com/kocheck/office-space) (the Mac menu bar app) installed and running; the extension talks to it through its `hub` tool.

## Commands

| Command | |
|---|---|
| **Agents** | Every agent session with status, project, branch and cost. Message, open, approve, interrupt, resume or stop. |
| **Needs You** | Go through each agent waiting on you: see the question and recent output, then approve (⌘Y), decline, reply, mark as seen or open it. |
| **Message Agent** | Pick an agent and type. With a message argument, it's one step. |
| **Run Recipe** | Start an agent from a saved recipe (repo, worktree, pinned servers, brief, first message). |
| **Dev Servers** | Running and pinned servers: open, copy URL, pin, start, stop, restart, logs. |
| **Skills** | Search the skills library, edit a skill, choose Claude Code / Codex / Cursor, import skills found elsewhere. |
| **Today's Agent Digest** | What each agent did today. |
| **Send Page to Agent** | The current browser tab with its content as Markdown (via Raycast's browser extension), plus your note, to the agent working on that page. |
| **Send Selection / Clipboard / Finder Selection to Agent** | Text or files from any app to an agent, with a note. |
| **Start Agent from Issue or PR** | Paste a GitHub issue or PR, or a Linear issue. It finds your local clone, makes a worktree branch (a PR's own branch for PRs), and starts Claude Code or Codex with the issue as its brief. |

## Preferences

- **hub Path**: leave empty to use `/Applications/OfficeSpace.app/Contents/MacOS/hub`.
- **Code Folders**: where your repos live, for Start Agent from Issue or PR.
- **Linear API Key**: optional, for Linear issues. GitHub uses the `gh` CLI if you have it (private repos), otherwise GitHub's public API.

## Install (until it's in the Store)

```sh
cd raycast/extension
npm install
npm run dev        # imports it into Raycast; Ctrl-C when done, it stays installed
```

Or run Raycast's **Import Extension** command and pick this folder.

## Development

- `npm run check`: typecheck, ESLint, Prettier.
- `TEST_HUB=/Applications/OfficeSpace.app/Contents/MacOS/hub npm run test:hub`: runs the library code against a live helper.
- The extension only uses `hub … --json` and `officespace://` links, the app's public interface.
