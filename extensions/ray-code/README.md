# Ray Code

Ray Code is a Raycast extension designed to turn AI chat into a local-first coding agent. It wraps common filesystem tasks in a safe, workspace-aware toolkit so you can drive development workflows with natural language while staying productive on the desktop.

## Key Features
- **Interactive onboarding**: The `Get Started with Ray Code` command walks you through the workspace setup and surfaces project details when connected.
- **Safe path resolution**: Every tool validates that the requested path stays inside the workspace root.
- **Comprehensive file tooling**: Includes read, list, grep, fuzzy search, text replace, create, and delete helpers.

## Available Commands
- `Get Started with Ray Code`: Shows the current workspace status and provides quick actions to open preferences or view Raycast’s setup guide.

## Tool Capabilities
Each tool expects paths relative to the configured workspace root:

| Tool          | Purpose |
| ------------- | ------- |
| `read-file`   | Read the contents of a file. |
| `list-dir`    | List entries within a directory. |
| `grep`        | Find matches within a single file and return all hits. |
| `search-files`| Perform fuzzy file or folder search, skipping common build/artifact directories. |
| `apply-edit`  | Replace text within a file, either the first match or every occurrence. |
| `create-file` | Create a file, creating parent folders as needed and optionally overwriting existing files. |
| `delete-file` | Delete a file after confirming the irreversible action. |
