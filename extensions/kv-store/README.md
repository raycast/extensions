# Key Value Store

Store key-value pairs locally in Raycast, organize them into categories, and copy values in a few keystrokes.

## Search and Copy

1. Run the **Search Key Values** command.
2. Start typing a key.
3. Press `Enter` on an existing key to copy its value.
4. If there is no exact match, select **Create Key**, enter a value, optionally choose a category, and press `⌘ Enter`.

Open the Action Panel with `⌘ K` to edit or delete a key, copy its name, move it to another category, or create a new key.

## Generate Passwords

Run the standalone **Generate Password** command, select **Generate Password** from an Action Panel, or press `⌘ ⇧ G` inside **Search Key Values**. Enter a key name, optionally choose a category, choose the password length and allowed character sets, and list any characters that must be excluded. The extension guarantees at least one character from every selected set, saves the generated password as the key's value, and copies it to the clipboard. The defaults remain 12 characters with lowercase letters, uppercase letters, and numbers.

## Categories

Select **Create Category** in the main view, then choose the category when creating or editing a key. Keys without an assigned category remain under **Uncategorized**.

Deleting a category does not delete its keys. They are moved to **Uncategorized**.

## Menu Bar

Run **Key Values in Menu Bar** once to add a key icon to the macOS menu bar. Categories appear as nested folders, while uncategorized keys appear in their own section. Selecting a key copies its value.

All data is stored locally in Raycast's extension storage.
