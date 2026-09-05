# raynotes — design

Date: 2026-07-29
Status: approved

## Problem

Raycast's native Notes caps the free plan at 5 notes. The cap is enforced when
creating a note, so the primary use — fast capture — stops working once the cap
is reached. Unlimited notes require Raycast Pro.

A second need: notes must be editable by an AI agent (Claude Code) on demand —
read all notes, reorganize them, rewrite them. Native notes live in
`raycast-enc.sqlite`, a SQLCipher database whose rich-text column holds
ProseMirror JSON. Reaching them requires key derivation from the Keychain plus a
markdown↔ProseMirror converter.

Both problems disappear if notes are plain markdown files owned by the user.

## Solution

A local Raycast extension backed by plain `.md` files in `~/notes/`.

- No paywall: Raycast extensions and their hotkeys are free and unlimited.
- No bridge: the AI agent reads and writes the files directly with its normal
  file tools. No MCP server, no SQLCipher, no format conversion.
- No sync: the filesystem is the single source of truth, so there is no
  background polling and nothing to reconcile.

### Non-goal: the floating window

Raycast's floating Notes window is an app feature, not something the extension
API exposes. This extension cannot reproduce it. The closest equivalent is a
hotkey that opens a full-height text area. Users who want the floating window
specifically need Raycast Pro.

### Non-goal: bypassing the note cap

Writing rows into `raycastNotes` past the free-plan limit circumvents a
commercial license term. This project does not do that. It stores its own files
and never touches Raycast's database.

## Architecture

Every read walks `~/notes/` recursively and loads the markdown files it finds.
Nothing is cached, indexed, or stored outside that directory. Renaming, moving,
nesting, or deleting files in Finder — or editing them from Obsidian, vim, or an
AI agent — needs no reconciliation, because there is no second copy to
reconcile.

At 2 KB per note, reading a thousand notes costs roughly 40 ms, and five
thousand roughly 200 ms. Loading everything up front stays imperceptible far
beyond any realistic note count, and it makes full-text search free: the content
is already in memory.

```
~/notes/
├── daily/
│   └── 2026-07-29.md        ← Quick Note appends here
├── asd.md
└── work/
    └── raycast-extension.md
```

### Modules

| Module                      | Responsibility                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/notes.ts`          | Pure helpers: scan directory, parse title, build slug, resolve daily path. No Raycast imports, no side effects beyond fs. |
| `src/components/editor.tsx` | The text area, autosave, and file naming. Shared by both commands that write notes.                                       |
| `src/quick-note.ts`         | `no-view` command. Appends one line to today's daily note.                                                                |
| `src/new-note.tsx`          | `view` command. Opens a blank editor.                                                                                     |
| `src/notes.tsx`             | `view` command. List, detail preview, and actions.                                                                        |

Keeping the filesystem helpers free of Raycast imports means they can be
exercised directly with `node` during development.

## Commands

### Quick Note

Mode `no-view`, with a single required text argument. The user presses the
hotkey, types into the root search bar, and presses Enter. No view renders.

Appends `- HH:MM <text>` to `~/notes/daily/YYYY-MM-DD.md`, creating the file
with a `# YYYY-MM-DD` heading when it does not exist, then shows a HUD.

Dates and times use the **local** timezone. A note captured at 02:00 belongs to
that local day, not to the previous UTC one.

### New Note

Mode `view`. Opens a blank editor straight away.

This exists as a root command because Raycast hotkeys bind to commands, not to
actions inside a list. Without it, writing a standalone note means opening the
list first and pressing `⌘N` from there.

Saving closes Raycast and pops to root, since there is no list to return to.
Popping matters: closing the window on its own leaves the form mounted, so the
next launch would reopen on the note just saved.

### Notes

Mode `view`. Lists every markdown file under the notes directory, sorted by
modification time, newest first.

- **Title** — the file's first non-empty line, with leading `#` stripped.
  Read live from content, so it stays correct after any external rename.
- **Subtitle** — the containing folder path relative to the notes directory,
  empty for top-level notes.
- **Detail** — the note's markdown, rendered.
- **Search** — matches against title and full content.

Actions:

| Key     | Action                                    |
| ------- | ----------------------------------------- |
| `Enter` | Open the editor form                      |
| `⌘N`    | New note                                  |
| `⌘O`    | Open in the default `.md` application     |
| `⇧⌘F`   | Reveal in Finder                          |
| `⇧⌘,`   | Copy the file path                        |
| `⌘⌫`    | Delete (confirm, then move to `~/.Trash`) |

Deletion moves the file to the Trash rather than unlinking it, so a mistaken
keystroke stays recoverable.

### Editor form

A single full-height `Form.TextArea` — no title field. The first line of the
content is the title, matching how native Raycast Notes behaves.

Content autosaves on a 500 ms debounce. Without it, typing and pressing Escape
would silently discard the work; native Notes never asks the user to think about
saving, and neither should this.

`Enter` saves and closes, so a capture ends on the same key that starts it
elsewhere in Raycast. `⇧Enter` still breaks the line, which is what keeps
multi-line notes writable.

A new note has no file behind it until its first autosave. That save slugs the
current first line into a filename, suffixing `-2`, `-3`, … on collision, and
every later save writes to that same path. A note left empty is discarded
without ever reaching disk.

### Filenames are never rewritten

The extension picks a filename once, at creation, and never renames the file
afterwards — not even when the first line changes. Stable paths keep agent
references and git history intact.

This constrains the extension, not the user: renaming, moving, and re-foldering
files by hand is fully supported, and the list keeps showing the correct title
because it reads the title from the content rather than from the filename.

## Preferences

| Name             | Type      | Default   |
| ---------------- | --------- | --------- |
| `notesDirectory` | directory | `~/notes` |

The directory is created on first use if it does not exist.

## Out of scope

Frontmatter and metadata, tags, a fixed folder taxonomy, pinning, and any bridge
to Raycast's native notes. Search covers the current need; these can be added if
a concrete need appears.

## Testing

Manual, through `npm run dev`, against the scenarios that carry real risk:

- Quick Note creating the day's file, then appending to it.
- Quick Note near local midnight landing on the correct day.
- Creating a note, editing it, and confirming the autosave debounce persists it.
- Escaping out of the editor without losing content.
- Renaming, moving, and nesting files in Finder, then reopening the list.
- Deleting a note and recovering it from the Trash.
- Slug collisions producing `-2` rather than overwriting.

The helpers in `src/lib/notes.ts` are pure and can be exercised directly with
`node`. A test framework is not worth its weight for a personal extension of
this size; add one if the logic grows.

## Environment

Node v22 and npm 10 are installed. Bun is not, and is not needed — Raycast
extensions build with npm. The extension is installed locally through
`npm run dev` and stays available in Raycast after the dev process stops.
