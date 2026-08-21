# Key Value Store

Store key-value pairs locally in Raycast, organize them into categories, and copy values in a few keystrokes.

## Search and Copy

1. Run the **Search Key Values** command.
2. Start typing a key.
3. Press `Enter` on an existing key to copy its value.
4. If there is no exact match, select **Create Key**, enter a value, optionally choose a category, and press `⌘ Enter`.

Open the Action Panel with `⌘ K` to edit or delete a key, copy its name, move it to another category, or create a new key.

## Generate Passwords

Run the standalone **Generate Password** command, select **Generate Password** from an Action Panel, or press `⌘ ⇧ G` inside **Search Key Values**. Enter a key name, optionally choose a category, and submit the form. The extension generates a 12-character password using only letters and digits, saves it as the key's value, and copies it to the clipboard.

## Categories

Select **Create Category** in the main view, then choose the category when creating or editing a key. Keys without an assigned category remain under **Uncategorized**.

Deleting a category does not delete its keys. They are moved to **Uncategorized**.

## Menu Bar

Run **Key Values in Menu Bar** once to add a key icon to the macOS menu bar. Categories appear as nested folders, while uncategorized keys appear in their own section. Selecting a key copies its value.

All data is stored locally in Raycast's extension storage.
