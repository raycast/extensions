# Git Clone Extension for Raycast

## Overview
This Raycast extension allows you to easily clone Git repositories directly from your Raycast interface. It streamlines the process of cloning repositories by providing a user-friendly interface within Raycast, supporting both personal and organizational repositories.

## Features
- Clone Git repositories with a simple command
- Browse and select repositories from your personal account and organizations
- Select destination directory for cloned repositories
- Choose which branch to clone
- Supports GitHub repositories

## Installation
1. Open Raycast
2. Search for "Git Clone" in the Extensions store
3. Click "Install"

## Configuration
This extension requires some initial setup:

1. Create a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token"
   - Give it a name and select the "repo" scope
   - Copy the generated token

2. Set up the extension preferences:
   - Open Raycast preferences
   - Go to the Extensions tab and find "Git Clone"
   - Set the following preferences:
     - Personal Access Token: Paste your GitHub token here
     - Default Clone Path: Set your preferred default directory for cloning repositories

## Usage
1. Open Raycast
2. Type "Git Clone" and press Enter
3. Select "MyRepo_and_OwnerRepo" for your personal repositories, or choose an organization
4. Select the repository you want to clone
5. Choose the destination directory (defaults to your set preference)
6. Select the branch you want to clone
7. Press Enter to start cloning

## Requirements
- Git must be installed on your system
- Raycast version 1.31.0 or higher
- GitHub account with personal access token

## Troubleshooting
If you encounter any issues:
1. Ensure Git is properly installed and configured on your system
2. Check that your GitHub Personal Access Token is correct and has the necessary permissions
3. Verify your internet connection
4. Make sure the Default Clone Path set in preferences exists and is writable

For further assistance, please open an issue on the GitHub repository.

## Author
taramanji (javalangruntimeexception)

## Privacy
This extension requires a GitHub Personal Access Token to function. This token is stored securely in Raycast's preferences and is only used to authenticate with GitHub API for fetching repository and organization information. No data is sent to any third-party services.
