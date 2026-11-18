# Clean Agent Text

Cleans text copied from AI agent TUIs (like Claude Code, Aider, etc.) by removing box-drawing characters, pipe borders, and reformatting the text.

## Usage

1. Copy text from an AI agent terminal UI
2. Run the "Clean Agent Text" command (alias: `cat`)
3. The cleaned text replaces your clipboard contents

## Modes

Configure the mode in the command preferences:

- **Auto** (default) — detects whether the clipboard contains code or prose and formats accordingly
- **Text** — collapses wrapped lines into paragraphs
- **Code** — preserves line breaks and normalizes indentation
