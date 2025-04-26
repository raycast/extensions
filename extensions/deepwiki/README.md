# DeepWiki Raycast Extension

This extension allows you to quickly search for and open GitHub repositories on [DeepWiki](https://deepwiki.com/).

## Features

- **Open DeepWiki Page:** Quickly open the DeepWiki page for a specific GitHub repository using its URL or `owner/repo` identifier.
- **Search DeepWiki Repos:** Search for repositories indexed by DeepWiki directly within Raycast.

## Commands

### Open DeepWiki Page

- **Action:** Opens a DeepWiki page.
- **Input:** Accepts a GitHub repository URL (e.g., `https://github.com/microsoft/vscode`), a DeepWiki URL (e.g., `https://deepwiki.com/microsoft/vscode`), or just the `owner/repo` identifier (e.g., `microsoft/vscode`).
- **Usage:** Activate Raycast, type `Open DeepWiki Page`, enter the repository identifier, and press Enter.

### Search DeepWiki Repos

- **Action:** Searches DeepWiki for indexed repositories.
- **Usage:** Activate Raycast, type `Search DeepWiki Repos`, and start typing your search query (e.g., `react`, `typescript`, `vscode`).
- **Results:** Displays a list of matching repositories. Selecting a result provides actions:
  - Open the repository's page on DeepWiki (Primary Action).
  - Open the repository's page on GitHub.
  - Use the "Open DeepWiki Page" command with the selected repo.
  - Copy DeepWiki URL, GitHub URL, or `owner/repo` identifier to the clipboard.

## Setup

No setup is required. Just install the extension.

## Author

Vivek Nair (vivek@gentrace.ai)
