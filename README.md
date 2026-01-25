# Better GitHub Search

Search your GitHub repositories with speed, auto-discovery, and smart recent items.

## Features

- **Auto-Discovery**: Automatically discovers all your organizations - no manual configuration needed.
- **Realtime Search**: Instant search across all your repositories (User + All Organizations).
- **Smart Caching**: Repositories are cached locally with automatic background refresh every 5 minutes.
- **Recent Items**: Your top 6 most recently visited repositories appear at the top.
- **Browser Integration**: Opens repositories in your default browser.
- **Private Repos**: Full support for private repositories and organizations.

## Setup

1. **Create a GitHub Personal Access Token (PAT)**
   - Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
   - Click "Generate new token (classic)".
   - Select these scopes:
     - `repo` - Full control of private repositories
     - `read:org` - Read access to organizations (required for auto-discovery)
   - Generate and copy the token.

2. **Install Extension**
   - Run `npm install` to install dependencies.
   - Run `npm run build` to build the extension.

3. **Configure Extension**
   - Open Raycast and search for "Search GitHub Repositories".
   - Press `Cmd + ,` to open Preferences.
   - Paste your PAT into the "GitHub Personal Access Token" field.
   - That's it! The extension will automatically discover all your organizations.

4. **Setup Keybinding (Optional)**
   - In Raycast, search for "Search GitHub Repositories".
   - Press `Cmd + K` and select "Record Hotkey".
   - Press your desired keybinding (e.g., `Cmd + Shift + G`).
   - The command will now be accessible via this hotkey.

## Usage

- **Search**: Type to filter by name, description, or owner.
- **Open**: Press `Enter` to open in your default browser.
- **Copy URL**: Press `Cmd + .` to copy the repository URL.
- **Refresh**: Press `Cmd + R` to manually refresh all repositories.
- **Auto-Refresh**: Repositories automatically refresh every 5 minutes in the background.
