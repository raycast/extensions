# Agent Skills for Raycast

Search your local agent skills or type a free-form prompt, then apply it to the text currently in your clipboard from [Raycast](https://raycast.com), the macOS productivity app.

This extension scans `~/.agents/skills` for `SKILL.md` files, lets you fuzzy-search them in Raycast, shows the selected skill's description, and runs either the chosen skill or your current search text against clipboard text using Raycast AI.

## Features

- Recursively discovers local skills from `~/.agents/skills`
- Fuzzy-searches skills by name, folder, and description
- Shows the selected skill's description in a side panel
- Runs the selected skill against your clipboard contents
- Falls back to running your search text as a free-form prompt when no skill matches
- Supports per-skill model selection via `SKILL.md` frontmatter

## Requirements

- [Raycast](https://raycast.com) for macOS with AI access enabled
- A local skills directory at `~/.agents/skills`
- Skills stored as folders containing a `SKILL.md` file

## Skill Format

The extension reads simple frontmatter from each `SKILL.md` file:

```yaml path=null start=null
---
name: summarize
description: Summarize the input into the key points
model: OpenAI_GPT-5.4_mini
---
```

Supported frontmatter fields:

- `name`: display name in Raycast
- `description`: short description shown in the detail pane
- `model`: optional Raycast AI model enum key or model value passed to `AI.ask`

The rest of the file is treated as the skill instructions. The extension appends the clipboard content under an `INPUT:` section before sending the prompt to Raycast AI.

## Development

Install dependencies:

```bash path=null start=null
npm install
```

Run the extension in development mode:

```bash path=null start=null
npm run dev
```

Build the extension:

```bash path=null start=null
npm run build
```

## Notes

- If a skill does not specify `model`, Raycast uses its default model selection for `AI.ask`
- If the clipboard is empty, the command will refuse to run
- If Raycast AI access is unavailable, the command shows an error toast instead of executing
- When no skill matches your search, press Enter to run the search text itself as a prompt on the clipboard text

## License

MIT
