# Forgejo Repositories

Manage your self-hosted [Forgejo](https://forgejo.org) repositories directly from Raycast.

## Features

- **List & Search Repositories** — Browse all your repositories with language and last-updated metadata. Results are cached for instant load on repeat opens.
- **Create Repository** — Open a create form with ⌘N from anywhere in the list.
- **Copy SSH Clone URL** — Copy the SSH clone URL of any repository with ⌘C.

## Setup

1. Open Raycast Preferences → Extensions → Forgejo
2. Fill in the required preferences:

| Preference | Description | Example |
|------------|-------------|---------|
| **Forgejo URL** | Base URL of your Forgejo instance | `https://forgejo.example.com` |
| **API Token** | Personal access token with `repository` scope | Generate in Forgejo → Settings → Applications |
| **Username** | Your Forgejo username | `alice` |
| **SSH Clone URL Template** | Template for SSH clone URLs | `git@forgejo.example.com:{owner}/{repo}.git` |

The SSH Clone URL Template uses `{owner}` and `{repo}` as placeholders replaced at runtime.

## Commands

### List Repositories

Browse and search your Forgejo repositories. Each row shows the repository name, primary language, and time since last update.

| Action | Shortcut |
|--------|----------|
| Open in browser | ↵ |
| Copy SSH clone URL | ⌘C |
| Create repository | ⌘N |

### Create Repository

Press ⌘N from the repository list to open the create form. Set a name, optional description, and visibility — private by default.
