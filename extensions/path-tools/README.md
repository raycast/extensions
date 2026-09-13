# Path Tools for Raycast

Path Tools groups common Finder, iTerm, and Visual Studio Code path operations into three Raycast commands:

- `Finder -> iTerm`: Open the current Finder directory in a new iTerm tab.
- `iTerm -> Finder`: Open the active iTerm shell's working directory in Finder.
- `Finder -> VS Code`: Open the current Finder directory in Visual Studio Code.
- `Search and Open in iTerm`: Search files and folders, then open the selected directory in iTerm.

## Run Locally

```bash
npm install
npm run dev
```

On first use, allow Raycast to control Finder, iTerm, and Visual Studio Code in macOS System Settings > Privacy & Security > Automation. The iTerm command requires iTerm Shell Integration; it reads iTerm's reported working directory without sending input to the terminal.
