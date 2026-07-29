# TaskNotes Raycast Extension

Create, search, and update [TaskNotes](https://tasknotes.dev/) tasks directly from Raycast.

This is an unofficial Raycast extension for TaskNotes.

## Setup

1. Run `npm install`.
2. Run `npm run dev`.
3. Set the extension preferences:
   - `Vault Mode`: `Single Vault` or `Multiple Vaults`.
   - `Obsidian Vault or Vaults Folder`: in single-vault mode, your vault folder; in multiple-vault mode, the parent folder containing your vault folders.
   - `Show Completed Tasks`: include or hide completed tasks in Search Tasks.

In multiple-vault mode, run `Switch Default Vault` once to choose the vault used by inline Quick Add and preselected in Create Task.

The extension reads TaskNotes settings from each vault's `.obsidian/plugins/tasknotes/data.json` file. This includes the tasks folder, task identification method, field mapping, title-in-filename setting, filename format, default status, default priority, natural-language date target, and task creation defaults. The fallback preferences are used only when those settings cannot be read.

## Commands

- `Quick Add Task`: creates a task inline from natural language, including dates, `#tags`, `@contexts`, project references, and priority. In multiple-vault mode, it uses the vault selected with `Switch Default Vault`.
- `Switch Default Vault`: changes the default vault used by inline Quick Add and preselected in Create Task.
- `Search Tasks`: scans Markdown files in the configured vault or vaults for TaskNotes frontmatter, opens tasks, and toggles completion.
- `Show Agenda`: shows open tasks with due or scheduled dates, grouped by date.
- `Create Task`: creates a Markdown file with TaskNotes-compatible YAML frontmatter. In multiple-vault mode, choose the target vault first.

## Natural Language

Examples:

```text
Follow up with Alex tomorrow morning #work @calls high priority
Submit expenses by Friday #admin @office !p2
Prepare launch checklist for project Client Launch tomorrow
Plan review on May 4 -- Bring project notes
```

Projects are stored as TaskNotes-compatible Obsidian links. Existing `[[Project]]` links and vault-relative paths are preserved; a plain project name is linked automatically, with an unambiguous matching note using its full vault-relative path.

In multiple-vault mode, inline Quick Add needs a default vault. Set it with `Switch Default Vault`.

The extension also exposes a Raycast AI tool named `Create Task Note`, so Raycast AI can create TaskNotes tasks from typed or conversational requests.

## Credits

Special thanks to [Callum Alpass](https://github.com/callumalpass) for creating [TaskNotes](https://tasknotes.dev/).

TaskNotes is open source under the MIT License. The icon used by this extension is derived from `tasknotes-simple.svg` in the upstream TaskNotes repository. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
