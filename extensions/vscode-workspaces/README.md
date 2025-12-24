# VS Code Workspaces for Raycast

Browse and open your Visual Studio Code workspaces directly from Raycast.  
The extension reads VS Code’s workspace history and presents it in a searchable list with useful actions.

## Features

### Workspace listing
- Fast search across all known workspaces
- Displays recently opened time
- Sort by name, recent activity, favorites, or project type
- Supports pinned (favorite) workspaces

### Actions
- Open workspace in VS Code
- Mark or unmark workspace as favorite
- Open workspace directory in terminal
- Reveal workspace folder in Finder / Explorer
- Copy workspace path
- Copy workspace name
- Remove workspace from VS Code history

### Editor support
- Visual Studio Code
- VS Code Insiders
- VSCodium
- Cursor

### Platform support
- macOS
- Windows

## Project type detection

The extension attempts to detect the project type based on files in the workspace and shows a matching icon.

Detected ecosystems include:

**JavaScript / TypeScript**
- Raycast Extensions
- Next.js
- React
- Vue / Nuxt
- Angular
- Svelte
- Node.js

**Backend frameworks**
- Django
- Flask
- FastAPI
- Spring
- Ruby on Rails

**Languages**
- Python
- Go
- Rust
- Java
- Kotlin
- Ruby
- PHP
- C#
- Swift
- Dart / Flutter
- Elixir
- Scala
- Haskell

## Installation

Install from the Raycast Store:  
https://raycast.com/yugveer28/vscode-workspaces

Or build from source:

```bash
git clone https://github.com/Yugveer06/vscode-workspaces.git
cd vscode-workspaces
npm install
npm run dev
```

## Usage

1. Open Raycast
2. Run the command "VS Code Workspaces"
3. Search for a workspace
4. Press Enter to open or use actions for more options

### Default shortcuts

Action | Shortcut (Windows) | Shortcut (macOS)
------ | -------- | --------
Open workspace | `Enter` | `Enter`
Open with | `Ctrl` + `Shift` + `O` | `⌘` + `⇧` + `O`
Toggle favorite | `Ctrl` + `.` | `⌘` + `⇧` + `P`
Open in terminal | `Ctrl` + `T` | `⌘` + `T`
Reveal in file explorer | `Ctrl` + `E` | `⌘` + `E`
Copy path | `Alt` + `Shift` + `C` | `⌘` + `⇧` + `,`
Copy name | `Ctrl` + `Alt` + `C` | `⌘` + `⇧` + `.`
Delete workspace | `Ctrl` + `D` | `⌃` + `X`

## Requirements

- Visual Studio Code or a supported variant
- macOS or Windows

Git is optional and only used if branch information is available.

## How it works

The extension reads VS Code’s local workspace storage:

- macOS: ~/Library/Application Support/Code/User/workspaceStorage
- Windows: %APPDATA%\Code\User\workspaceStorage

No data is uploaded or synced externally.

## Privacy

All data is stored locally using Raycast’s LocalStorage API.
Workspace paths and metadata never leave your machine.

## Contributing

Pull requests are welcome.
Please keep changes minimal and focused.

## License

MIT License. See the LICENSE file for details.

## Credits

Author: Yugveer Singh Wadzatia
Icons: https://devicon.dev
