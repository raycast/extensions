# Obsidian AI Smart Capture

A focused Raycast command for writing a note and letting AI choose its existing folder in an Obsidian vault.

## How it works

1. Select a detected Obsidian vault on first launch. The extension remembers the choice.
2. Configure OpenRouter, OpenAI, Anthropic, or Gemini in the extension preferences.
3. Run **Smart Capture** and choose **New Note**, or run **Capture Note** to open the editor directly.
4. The extension builds a bounded profile from folder names, note titles, index notes, and short content excerpts.
5. AI returns a structured title, destination, and confidence.
6. The note is written without overwriting existing files. Uncertain notes go to the vault root.

`Smart Capture` opens a dashboard with the five most recent captures. `Capture Note` opens the editor directly and is intended for a global Raycast hotkey.

## Privacy and security

- The provider API key is stored as a secure Raycast password preference.
- The selected vault path is stored in the same extension-scoped local database.
- Requests go directly from the extension to the configured provider.
- Captured text and a bounded vault profile are sent to that provider for classification.
- Files that look credential-bearing are excluded from the vault profile.
- Archive, Excalidraw, Obsidian configuration, hidden folders, and attachment folders are not destination candidates.

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run dev
```

## Publishing

After completing the Raycast Store checklist, run `npm run publish` to open a submission pull request in [`raycast/extensions`](https://github.com/raycast/extensions).
