# QuickAdd Macro for Raycast

Trigger QuickAdd macros in Obsidian without context switching. Obsidian stays in the background while you capture.

## How It Works

This extension generates [Raycast Script Commands](https://manual.raycast.com/script-commands) for each macro you create. Each macro appears directly in Raycast search - type the name, enter your text, done.

## Setup

### 1. Prerequisites

- [QuickAdd plugin](https://github.com/chhoumann/quickadd) installed in Obsidian with at least one Macro
- Your QuickAdd macro must use a **named variable** like `{{VALUE:text}}`

### 2. One-Time Raycast Setup

Script Commands need a directory. Do this once:

1. Create a folder for scripts (any location works): `mkdir -p ~/scripts/raycast`
2. Open Raycast Preferences (`Cmd+,`)
3. Go to **Extensions** tab
4. Click **+** → **Add Script Directory**
5. Select the folder you created

### 3. Configure Extension

1. Open Raycast and run **"Create QuickAdd Macro"**
2. It will prompt you to set the **Script Commands Folder** - enter the path from step 2.1
3. Optionally set a **Default Vault** if you use multiple vaults

### 4. Create Your First Macro

1. Run **"Create QuickAdd Macro"**
2. Fill in the form:
   - **Command Name**: What you'll type in Raycast (e.g., "Daily Note")
   - **QuickAdd Macro**: Exact name from Obsidian (case-sensitive)
   - **Variable Name**: The variable in your template (e.g., `text` for `{{VALUE:text}}`)
3. Done! The macro now appears in Raycast search.

## Usage

1. Open Raycast
2. Type your macro name (e.g., "daily")
3. Enter your text in the argument field
4. Press Enter

Obsidian receives the content in the background - you never leave your current app.

## Tips

- **Set aliases** in Raycast for faster access (e.g., `dn` → Daily Note)
- Create multiple macros for different QuickAdd macros
- Each script is a standalone file - edit or delete them directly in your Script Commands folder (e.g., `~/scripts/raycast`)

## Troubleshooting

**Macro not appearing in Raycast?**
- Verify you added your Script Commands folder (e.g., `~/scripts/raycast`) as a Script Directory in Raycast Preferences
- Check the script exists in your Script Commands folder

**Macro not working?**
- Ensure QuickAdd macro name matches exactly (case-sensitive)
- Verify the variable name matches your template
- Check that QuickAdd is enabled in Obsidian

**Extra blank line in captured content?**
- Edit your macro format in Obsidian and remove trailing whitespace
