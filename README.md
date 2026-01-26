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

### 1. Create a GitHub Personal Access Token (PAT)

This extension requires a GitHub Personal Access Token to access your repositories.

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., "Raycast GitHub Search")
4. Select the following scopes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `read:org` - Read access to organizations (required for auto-discovery)
5. Click **"Generate token"**
6. **Copy the token** (you won't be able to see it again!)

### 2. Configure the Extension

1. Open Raycast and search for **"Search GitHub Repositories"**
2. When prompted, paste your Personal Access Token
3. That's it! The extension will automatically discover all your organizations

### 3. Setup Keybinding (Optional)

For faster access:

1. In Raycast, search for **"Search GitHub Repositories"**
2. Press `⌘K` and select **"Record Hotkey"**
3. Press your desired keybinding (e.g., `⌘⇧G`)
4. The command will now be accessible via this hotkey

## Usage

- **Search**: Type to filter by name, description, or owner.
- **Open**: Press `Enter` to open in your default browser.
- **Copy URL**: Press `Cmd + .` to copy the repository URL.
- **Refresh**: Press `Cmd + R` to manually refresh all repositories.
- **Auto-Refresh**: Repositories automatically refresh every 5 minutes in the background.

## Privacy & Security

- Your GitHub token is stored securely in Raycast's encrypted storage
- All API calls are made directly to GitHub's API
- Repository data is cached locally on your machine
- No data is sent to third-party servers

## Troubleshooting

### Extension shows "No results"

- Make sure your GitHub token is valid and has the correct scopes
- Try pressing `⌘R` to manually refresh repositories
- Check your internet connection

### Organizations not showing up

- Ensure your token has the `read:org` scope
- Press `⌘R` to refresh - organization discovery happens on refresh

### Need Help?

Open an issue on [GitHub](https://github.com/raycast/extensions) or reach out on the [Raycast Community](https://raycast.com/community).
