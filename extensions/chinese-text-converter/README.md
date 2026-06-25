# Chinese Text Converter

Convert text between Traditional Chinese and Simplified Chinese.

## Features

- Convert selected text between Traditional and Simplified Chinese with a single command, without needing two separate commands.

## Known Issues

### Inaccurate Empty-Selection Detection

Because macOS lacks a native API for retrieving selected text, Raycast simulates `Cmd+C` internally. Some editors copy the current line automatically when no text is selected — for example, VS Code and Zed both exhibit this behavior. As a result, the extension may inadvertently convert and paste the entire line when nothing is actually selected, breaking the user's layout.

To mitigate this, the extension checks whether the retrieved text ends with a trailing newline (`\n` or `\r\n`) and aborts the conversion if so. However, this heuristic has the following limitations:

- **Not universal:** Some apps do not append a trailing newline when copying the current line on an empty selection. Notion and Obsidian are known examples.
- **False positives:** The check may incorrectly abort if the user intentionally selects text that ends with a newline.
