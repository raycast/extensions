# Super Copy/Paste

Super Copy/Paste is a Raycast extension that lets you apply regular expressions (Regex) sequentially to text when copying or pasting. 

![Manage Rules]

## Features
- **Super Copy**: Grabs your currently selected text, cleans it using your active regex rules, and copies the result directly to your clipboard.
- **Super Paste**: Reads the raw text from your clipboard, cleans it using your active regex rules, and pastes the result into your active application.
- **Rule Profiles**: Comes with 3 independent profiles for both Copy and Paste (e.g. `Super Copy 1`, `Super Paste 2`), allowing you to set up multiple contexts for different workflows.
- **Rule Management**: A UI to Add, Edit, Delete, Toggle, and Sort your rules.
- **Regex Snippets Assistant**: Quickly insert common regex patterns with a built-in cheat sheet (`Cmd+I`).

## Getting Started
1. Open Raycast and run the **Manage Rules** command.
2. Select a profile from the dropdown (e.g., `Super Copy 1`).
3. Press `Cmd+N` to create a new rule.
4. Input a Regex pattern to Find, and a string to Replace With. Hit `Cmd+Enter` to save.
5. Highlight some text in any app, open Raycast, and run **Super Copy 1**.
6. The cleaned text is now in your clipboard!

## Example Uses
- **Sanitize URLs**: Remove tracking parameters from copied URLs.
- **Clean Whitespace**: Remove trailing spaces or convert multiple newlines into single spaces.
- **Format Code**: Strip comments from code snippets before pasting them into chat.

