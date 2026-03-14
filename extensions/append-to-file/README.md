# Append to File

Append quick ideas, quotes, and notes to your text files without leaving your current context.

If you read something and want to save a thought immediately, this extension gives you fast, clipboard-first and text-first append workflows right inside Raycast.

## What this extension is for

You use text files, Markdown notes, and quick scratchpads. You do not want to switch apps, open a new editor window, and lose your flow.

`Append to File` is built for that exact moment:

- Capture something from clipboard in one command.
- Rewrite or refine text in a tiny form, then append.
- Append the latest clipboard text directly to the last file you appended to, in one action.
- Undo the most recent append if needed.

## Why this approach

This is intentionally a small workhorse, not a full document editor.

- Small surface area.
- Opinionated safe defaults.
- Strong guardrails around what can be modified.
- Minimal actions you can trust during fast workflows.

## Core commands

| Command | What it does |
|---|---|
| Append Text from Clipboard to File | Pick text from clipboard history and append it to a file. |
| Append Text to File | Open a text input, edit the content, then choose a file and append it. |
| Quick Append Current Clipboard Text to Last Appended File | Append the latest clipboard text directly to the last file you appended to. |
| Undo Last Append | Revert only the most recent append when it is still safe to do so. |
| Open Last Appended File | Open the last file you appended to. |

## Designed for text-first workflows

By default, the extension is limited to:

- `.txt` or `.text` 
- `.md` or `.markdown`

You can expand this list in preferences if you want to support other plain-text formats.

This is intentional to keep append operations simple and low risk.

## Key behavior

- File discovery uses macOS Spotlight for speed and falls back to recursive scan only when needed.
- Search includes only directories and extensions you allow.
- Text appends are done with newline and separator controls, including quick insert-at-end or insert-at-beginning.
- File content is written atomically, so extension updates are safer.
- Unicode encodings are handled with care (including UTF-8/UTF-16 variants).
- Undo is blocked if the file changed after the last append, to avoid unsafe restores.

## Preferences you can tune

| Preference | Purpose |
|---|---|
| Root Directories | Search roots for files. |
| Allowed Extensions | Allowed file extensions for safety. |
| Search Excludes | Paths/patterns to skip (for example `.git`, `node_modules`). |
| Search Max Depth | Folder depth limit for search. |
| Separator Rule | Controls spacing between existing content and appended content. |
| Custom Separator | Optional custom separator value (supports `\n` and `\t`). |
| Ensure Trailing Newline | Keep one trailing newline after append. |
| Timestamp Format | Format used when using timestamp mode. |
| Default Insert Position | Append at end or beginning by default. |
| Default Clipboard Offset | Preferred clipboard history item index (0 is latest). |

## Installation and development

```bash
npm install
npm run dev
```

Raycast should load the extension in development mode.

## Development commands

```bash
npm run build
npm test
npm run lint
```

## Feedback and philosophy

This extension is intentionally limited and focused. It was built with AI-assisted development as a practical tool, and it is evolving based on real usage feedback.

If you use it daily, you can shape its defaults in preferences and share ideas for what would make it better.

If you run into issues, check the [GitHub issues page](https://github.com/lenpr/raycast-text-to-file/issues) or open a new issue.
