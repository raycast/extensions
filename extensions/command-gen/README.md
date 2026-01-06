# Command Gen

A Raycast extension that generates CLI commands from natural language. Inspired by Cursor's Command K.

## Features

- **Natural language to CLI**: Describe what you want to do, get a ready-to-run command
- **Auto-paste**: Generated command is pasted directly into your active window
- **Context-aware**: Picks up selected text, current app, and directory to improve suggestions
- **History**: Recent prompts saved and filterable
- **Model choice**: Claude Haiku 4.5 or Gemini Flash 2.5 Lite

## Installation

1. Clone this repo
2. `npm install`
3. `npm run dev` to install in Raycast

## Configuration

Open Raycast Settings → Extensions → Command Gen:

- **Model**: Choose between Claude Haiku 4.5 or Gemini Flash 2.5 Lite
- **Anthropic API Key**: Required if using Claude ([get one](https://console.anthropic.com/))
- **Google AI API Key**: Required if using Gemini ([get one](https://aistudio.google.com/apikey))

## Usage

1. Invoke "Generate Command" from Raycast (assign a hotkey for quick access)
2. Type what you want to do (e.g., "find large files over 100MB")
3. Press **Enter** to generate and paste the command
4. Press **Cmd+Shift+C** to copy instead of paste

### History

- When search is empty, history is shown
- Type to filter history
- Select a history item to edit it before regenerating

### Context

The extension automatically captures:
- **Selected text** from the previous app (useful for error messages)
- **Current app** (only dev tools: Terminal, VS Code, etc.)
- **Current directory** (from Terminal/iTerm)

Context is only included when relevant to avoid confusing the model.
