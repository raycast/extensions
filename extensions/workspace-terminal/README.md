# Workspace Terminal - Raycast Extension

[English](README.md) | [日本語](README_ja.md)

Open your VS Code Project Manager workspaces from Raycast in your preferred terminal, with an optional startup command such as `claude`, `gh copilot`, or a dev server.

Workspace Terminal reads the projects you already saved with the VS Code Project Manager extension. It does not scan directories or require a separate project list.

## Requirements

- macOS
- Raycast
- VS Code with the Project Manager extension installed
- At least one project saved in Project Manager
- One supported terminal installed:
  - Ghostty
  - iTerm
  - Terminal.app
  - Warp
  - kitty
  - Alacritty
  - WezTerm

Some terminal integrations use AppleScript or app-specific automation. macOS may ask for Automation or Accessibility permissions the first time you launch a workspace.

## Usage

1. Install dependencies and start development mode:

   ```bash
   npm install
   npm run dev
   ```

2. Open Raycast and run **Open Workspace**.
3. Select a workspace saved in VS Code Project Manager.
4. Press Enter to open it in the configured terminal.

## Preferences

Configure the extension from Raycast preferences.

| Preference | Description |
| --- | --- |
| **VS Code App** | VS Code-compatible app whose Project Manager storage should be used. Defaults to Visual Studio Code. |
| **Project Manager Data Path** | Optional override for the Project Manager data directory or `projects.json` file. |
| **Terminal** | Terminal used to open workspaces. |
| **Default Command** | Command to run after opening a workspace. Leave empty to only open the terminal. |
| **Command Mode** | How startup commands are executed. Defaults to `Keep Shell After Command`. See "Command Mode differences" below. |
| **Reuse Existing Window** | Best-effort reuse behavior. Some terminals do not support this. |
| **Shell Path** | Shell used for command execution. Defaults to `/bin/zsh`. |
| **Group Projects by Tag** | Group Project Manager projects by tag in the list. |
| **Hide Projects Without Tags** | Hide untagged projects. |
| **Hide Disabled Projects** | Hide entries where `enabled` is `false`. |

### Command Mode differences

| Mode | Behavior | Best for |
| --- | --- | --- |
| **Keep Shell After Command** | Opens the workspace, runs the command, and keeps a shell open afterward. Internally this behaves like `command; exec <shell>`. | Running `claude`, `gh copilot`, or a short setup command while continuing to work in the same terminal. |
| **Command Only** | Runs only the configured command. It does not add a shell-preserving step after the command exits. | Commands where it is acceptable for the terminal session to end, or commands that manage their own interactive session. |
| **Open Only** | Opens the terminal in the workspace directory without running a command. | Opening the project first and typing commands manually. |

The default is **Keep Shell After Command**. If you are unsure, this is the recommended mode because the terminal remains open even when the command exits quickly, which helps avoid close/warning behavior in terminals such as Ghostty.

## Actions

| Action | Shortcut | Description |
| --- | --- | --- |
| **Open in Terminal** | Enter | Open the workspace with the resolved command. |
| **Open Without Command** | Cmd Shift Enter | Open the workspace without running a command. |
| **Open with Custom Command…** | Option Enter | Enter a one-time command for this launch. |
| **Set Project Command…** | Cmd S | Save a command override for the selected project. |
| **Clear Project Command** | - | Remove the project-specific command override. |
| **Open in VS Code** | Cmd O | Open the workspace in the configured VS Code app. |
| **Copy Path** | Cmd . | Copy the workspace path. |
| **Show in Finder** | - | Reveal the workspace folder in Finder. |

Command resolution order:

1. Project-specific command override
2. Default Command preference
3. No command

## Project Manager data

By default, the extension resolves Project Manager storage from the selected VS Code app name:

```text
~/Library/Application Support/<VS Code App>/User/globalStorage/alefragnani.project-manager/projects.json
```

For standard VS Code this is:

```text
~/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json
```

If your Project Manager data is stored elsewhere, set **Project Manager Data Path** to either the data directory or the `projects.json` file.

Remote VS Code projects such as `vscode-remote://...` are shown but cannot be opened in a local terminal yet.

## Development

Install dependencies:

```bash
npm install
```

Start Raycast development mode:

```bash
npm run dev
```

Run lint:

```bash
npm run lint
```

Auto-fix lint and formatting issues:

```bash
npm run fix-lint
```

Build the extension:

```bash
npm run build
```

The build output is written to `dist/`.

## Notes

- The latest `@raycast/api` may warn if your local Node.js version is older than the preferred version. Use Node 22.22.2 or newer if you see engine warnings.
- Warp command launches use temporary Launch Configuration YAML files.
- kitty window reuse requires kitty remote control to be enabled.
- Ghostty uses its AppleScript integration instead of `ghostty +new-window`.
