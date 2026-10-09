# Obsidian Symlink Manager

A powerful Raycast extension for sharing and syncing selected Obsidian configuration items from a single "Default Vault" across all your other target vaults. Stop manually copying plugins, themes, and snippets every time they update!

## Setup

1. Open the **Raycast Preferences** for this extension.
2. Set the **Default Vault Path**. This is your "source of truth" vault (it must contain a physical `.obsidian` directory).
3. Run the **Manage Vault Symlinks** command to get started!

## Features

- **Dashboard Overview**: Automatically discovers your existing vaults. See a four-category breakdown (Plugins, Themes, CSS Snippets, Core Settings) and instantly spot what is missing, synced, or outdated.
- **Smart Link Management**: `TARGET ONLY` items are absent from your Default Vault. `MATCHING COPY` means both vaults have separate physical copies with identical contents. Seamlessly push, pull, unlink, and delete configurations.
- **Git History & Diff Inspector**: Inspect item history and view side-by-side JSON diffs. The extension tracks your Default Vault configuration history (using a localized `.obsidian/.git` repository) and lets you easily restore configurations from a commit.
- **Core Settings Sync**: Live-link or physically copy core settings such as `app.json` (Editor), `hotkeys.json` (Hotkeys), and `appearance.json` (Appearance).
- **Safe Operations**: Destructive actions always require explicit confirmation. Core files like `workspace.json` and `graph.json` are heavily protected and never synced.
- **Bootstrap & Sync Profiles**: Run **Bootstrap New Vault** to create a fresh vault mirroring your ideal configuration, or create Sync Profiles for 1-click deployments of your favorite plugins and snippets to any vault.

Existing live links reflect changes immediately, keeping your Obsidian environments perfectly in sync without the overhead of duplicate configurations!
