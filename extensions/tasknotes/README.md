# TaskNotes Raycast Extension

Create, search, and update [TaskNotes](https://tasknotes.dev/) tasks directly from Raycast.

This is an unofficial Raycast extension for TaskNotes.

## Setup

1. Run `npm install`.
2. Run `npm run dev`.
3. Set the extension preferences:
   - `Vault Mode`: `Single Vault` or `Multiple Vaults`.
   - `Obsidian Vault or Vaults Folder`: in single-vault mode, your vault folder; in multiple-vault mode, the parent folder containing your vault folders.
   - `Tasks Folder`: where new TaskNotes task files should be written.
   - `Task Tag`: the tag that identifies TaskNotes tasks, usually `task`.

## Commands

- `Quick Add Task`: creates a task from natural language, including dates, `#tags`, `@contexts`, and priority.
- `Search Tasks`: scans Markdown files in the configured vault or vaults for TaskNotes frontmatter, opens tasks, and toggles completion.
- `Create Task`: creates a Markdown file with TaskNotes-compatible YAML frontmatter. In multiple-vault mode, choose the target vault first.

## Natural Language

Examples:

```text
Follow up with Alex tomorrow morning #work @calls high priority
Submit expenses by Friday #admin @office !p2
Plan review on May 4 -- Bring project notes
```

In multiple-vault mode, pass the vault name in the `Quick Add Task` command's `Vault name` argument.

The extension also exposes a Raycast AI tool named `Create Task Note`, so Raycast AI can create TaskNotes tasks from typed or conversational requests.

## Credits

Special thanks to [Callum Alpass](https://github.com/callumalpass) for creating [TaskNotes](https://tasknotes.dev/).

TaskNotes is open source under the MIT License. The icon used by this extension is derived from `tasknotes-simple.svg` in the upstream TaskNotes repository. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
