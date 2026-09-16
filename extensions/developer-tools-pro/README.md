# DevT Pro for Raycast

Search, pin, and launch DevT Pro tools from Raycast on macOS and Windows. This extension connects Raycast to the DevT Pro app. The app and its source code are not included here.

## Requirements

- DevT Pro installed and opened at least once. Opening the app registers its `devtpro://` link with your system, and this extension uses that link to launch tools.
- Raycast for macOS (Raycast 2, or v1.104.16 or later) or Raycast for Windows.

## Usage

Run **Search Tools** in Raycast, then search by tool name, category, description, or keyword.

| Action | macOS | Windows |
| --- | --- | --- |
| Open Tool | <kbd>↵</kbd> | <kbd>Enter</kbd> |
| Open Tool with Input | <kbd>⌘</kbd> <kbd>E</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> |
| Pin Tool / Unpin Tool | <kbd>⌘</kbd> <kbd>.</kbd> (Raycast v1: <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>P</kbd>) | <kbd>Ctrl</kbd> <kbd>.</kbd> |
| Copy Deep Link | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>C</kbd> |

- **Open Tool** sends your clipboard text to tools that accept input. If the clipboard is empty, Raycast asks you for the input.
- **Open Tool with Input** always lets you review or type the input first.
- Pinned tools appear at the top of the list.

## Troubleshooting

### "DevT Pro Not Installed"

Install DevT Pro and open it once, then try again. Opening the app registers the `devtpro://` link used by this extension.

### A tool doesn't open

Make sure DevT Pro is up to date. Older versions of the app might not support every tool listed in Raycast.

## License

[MIT](LICENSE)
