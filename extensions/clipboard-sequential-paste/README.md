# Clipboard Sequential Paste

**Clipboard Sequential Paste** allows you to copy a list to your clipboard and paste the items one by one. This extension is designed to streamline your workflow when dealing with clunky user interfaces that require you to copy and paste lists item by item. Instead of manually entering each item, this extension allows you to copy a list to your clipboard and paste the items sequentially with ease.

## Features

- **Sequential Pasting**: Effortlessly paste multiple items from your clipboard one after the other.
- **Clipboard Handling**: The extension uses the most recent clipboard item, splitting it into a list based on newlines. When you copy something new, the next time you use the extension, it will create a new list from the updated clipboard content.
- **Restarting the List**: Once all items in the list have been pasted, the extension will start from the top of the list again.

## Debounce Time

To avoid overwriting the clipboard list with the item currently being pasted, a debounce time of **650 ms** is implemented. This prevents rapid commands or hotkey presses from causing unintended behavior.

## Usage

1. **Copy a List**: Copy a list of items to your clipboard.
2. **Paste Items**: Use the command to paste the next item from your clipboard list sequentially.

**Warning**: If you attempt to paste the next item without any input focused (e.g., in a random application), the item will not be pasted, similar to the behavior of the standard paste function. But the extension will still move on to the next item.
