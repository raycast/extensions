# GitHub Workflows

A [Raycast](https://raycast.com) extension for browsing your local git repositories and viewing or triggering their GitHub Actions workflow runs — without leaving Raycast.

## Commands

- **List Workflows** — browse your local repos, then view recent GitHub Actions workflow runs for the selected one (with search across the run history and pagination). Searching scans up to the most recent 1,000 runs looking for matches; if none are found in that window, it tells you the search was capped rather than implying no matching run has ever existed. If runs fail to load (e.g. an expired token or rate limit), you'll see a clear error state instead of an empty list.
- **Run Workflow** — browse your local repos, then trigger a `workflow_dispatch` workflow run, filling in any inputs it declares. Required and number-typed inputs are validated as you fill in the form, so mistakes are caught before submitting rather than surfacing only as a generic API error.

Both commands share the same repo browser. You can **pin repos** to keep your most-used ones at the top (`⌘` + `Shift` + `P` to pin/unpin, then reorder pinned repos with `Ctrl` + `↑`/`↓`). Pins are shared across both commands. Within **Run Workflow**, individual workflows can be pinned the same way, and workflows that support manual triggering are marked with a play icon.

Each run shown in **List Workflows** also has a "Run Workflow" action to re-dispatch that run's workflow (prefilled with the run's branch), when the workflow supports it.

## Setup

1. Install the extension in Raycast.
2. Open extension preferences and set:
   - **Repositories Folder** — a local folder whose immediate subfolders are your git repos (e.g. `~/Developer`).
   - **GitHub Personal Access Token** — a PAT with `repo` and `workflow` scopes. Create one at [github.com/settings/tokens](https://github.com/settings/tokens).
3. Run **List Workflows** or **Run Workflow** from Raycast.

The extension detects each repo's GitHub host (github.com or GitHub Enterprise Server) from its `origin` remote, so both are supported automatically.

## How it works

- Repos are discovered by scanning the immediate subfolders of your **Repositories Folder** for a `.git` entry, and are considered "has workflows" if they contain `.yml`/`.yaml` files under `.github/workflows`.
- Workflow runs and dispatches go through the GitHub REST API, using your PAT for authentication.
- Available inputs for `workflow_dispatch` workflows are parsed directly from the workflow YAML, so the run form matches what's defined in the file (text, boolean, choice, number, environment). Boolean inputs are sent to GitHub as the strings it expects (`"true"`/`"false"`), and number inputs are validated as numeric before the run is dispatched.
- Data (repo scans, workflow runs, workflow files) is cached locally so views load instantly and refresh in the background. Pinned repos and pinned workflows are each stored locally via Raycast's `Cache`.

## Development

```sh
npm install
npm run dev      # start a hot-reloading dev session in Raycast
npm run lint     # lint + format check
npm run build    # type-check and build
```

There is no automated test suite; validate changes with `npm run lint` and `npm run build`.
