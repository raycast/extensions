import { Detail } from "@raycast/api";

const helpMarkdown = `
# Obsidian Symlink Manager Guide

Welcome to the Obsidian Symlink Manager! This extension helps you sync plugins, themes, snippets, and settings from a single "Default Vault" (your source of truth) to all your other Obsidian vaults using symlinks and physical copies.

---

## 📚 Terminology Explained

When browsing your items, you'll see various status badges. Here is exactly what they mean:

* **AVAILABLE**: The item exists in your Default Vault but is missing from your current Target Vault. You can safely link or copy it over.
* **LINKED**: The item in your Target Vault is actively symlinked to your Default Vault. Any changes made in either vault will immediately reflect in both.
* **MATCHING COPY**: The item exists in both vaults as separate, independent physical folders/files, but their contents are completely identical.
* **DIFFERENT**: The item exists in both vaults as separate physical folders/files, but their contents have drifted and no longer match. (Use the Inspector to view the diff).
* **TARGET ONLY**: The item exists in your current Target Vault, but *not* in your Default Vault.

---

## 🚀 Core Features

### 1. Dashboard (Manage Vault Symlinks)
The dashboard is your main hub. It automatically discovers your vaults and categorizes your configurations. Select an item and press \`⌘ K\` to open the Actions panel, where you can:
* **Push to Target**: Link or copy an item from the Default Vault to the Target Vault.
* **Pull to Default**: Copy a Target Only item into your Default Vault to share it globally.
* **Unlink / Detach**: Convert a symlink back into a standard physical folder so it can be modified independently.
* **Open Inspector**: View side-by-side Git diffs and restore configurations from history.

### 2. Core Settings Sync
You can manage core Obsidian JSON settings (like Editor, Appearance, and Hotkeys). You can choose to:
* **Live Link**: The settings file is symlinked (e.g., changing a hotkey affects all linked vaults instantly).
* **Local Copy**: The settings file is copied physically (e.g., you start with the same hotkeys, but can tweak them independently later).

### 3. Bootstrap New Vault
Creating a new Obsidian vault? Use this command to instantly furnish it with your favorite plugins, themes, and snippets from the Default Vault. No more manually copying \`.obsidian\` folders!

### 4. Sync Profiles
Save your favorite combinations of plugins and snippets as a "Profile" (e.g., "Work Setup" vs. "Writing Setup"). You can apply a profile to any vault in one click.

---

## ⚠️ Safety First

* **Destructive Actions**: Deleting items or overwriting configurations always requires a manual confirmation.
* **Backups**: When overwriting settings, the extension creates automatic recoverable \`.bak\` copies.
* **Ignored Files**: \`workspace.json\` and \`graph.json\` are intentionally ignored by this manager to prevent corrupting your local vault states.
`;

export default function HelpCommand() {
  return <Detail markdown={helpMarkdown} />;
}
