# Canned Replies for Apple Mail ✉️

A Raycast extension that lets you save reusable email replies and insert them at the top of an Apple Mail compose/reply window in a flash. Create, edit, duplicate, delete, import/export, then insert — optionally sending immediately.


## 🗂️ Directory
- [Install](#-install)
- [Using The Extension](#-using-the-extension)
- [Import & Export](#-import--export)
- [Examples](#-examples)
- [Apple Mail Insertion](#-apple-mail-insertion)
- [Privacy & Storage](#-privacy--storage)
- [Shortcuts](#-shortcuts)
- [Troubleshooting](#-troubleshooting)
- [Known Limitations](#-known-limitations)
- [Feedback](#-feedback)
- [License](#-license)


## 🚀 Install
- From Raycast: Open Raycast → Store → search for “Canned Replies for Apple Mail” → Install.
- First launch: Raycast may prompt for permissions (Accessibility / Automation) so it can control Mail for the insert actions.


## 🧭 Using The Extension
- Open the command: Invoke Raycast and run “Canned Replies”.
- Search: Start typing to filter by title or body snippet.
- Create: Use “Create New Template” to add a reply.
- Manage: Select a template and open the Action Panel (⌘K or →) for more actions.

Template actions
- Insert and Send: Inserts the template at the top of the draft and sends immediately. Press ↩︎ (Enter) on a selected item.
- Insert Without Sending: Inserts at the top without sending. Shortcut: ⇧↩︎.
- Edit Template: Update title/body. Shortcut: ⌘E.
- Duplicate Template: Creates a copy with “(Copy)” added to the title. Shortcut: ⌘⇧D.
- Delete Template: Permanently removes the template (with confirmation).

General actions
- Create New Template: Shortcut: ⌘N.
- Import from JSON: Replace your current templates with a JSON file.
- Export to JSON: Save your current templates to a JSON file.

## 📥📤 Import & Export
Export
- Action: “Export to JSON”.
- Choose a folder; the file `canned-replies.json` is created with your templates.

Import
- Action: “Import from JSON”.
- Pick a JSON file matching the format below.
- If you already have templates, you’ll be asked to confirm replacement. Import replaces all existing templates.

JSON format
- Top-level: an array of objects (UTF‑8 encoded).
- Required fields per item: `title: string`, `body: string`.
- Optional fields per item: `id: string`, `createdAt: string`, `updatedAt: string`.
- Unknown fields are ignored.
- Defaults when missing/invalid:
  - `title` → "Untitled"
  - `body` → ""
  - `id` → random unique id
  - `createdAt` / `updatedAt` → current ISO timestamp

Minimal example
```
[
  { "title": "Out of office", "body": "I’m OOO until Monday.\nBest,\nName" },
  { "title": "Thanks", "body": "Thanks for reaching out! I’ll get back soon." }
]
```

Full example (ID createdAt and updatedAt are not required, but will be set upon import if missing)
```
[
  {
    "id": "reply-001",
    "title": "Out of Office",
    "body": "I’m out until 2025-09-15.\nCheers,\nName",
    "createdAt": "2025-09-09T12:34:56.789Z",
    "updatedAt": "2025-09-09T12:34:56.789Z"
  },
  {
    "id": "reply-002",
    "title": "Thanks For Reaching Out",
    "body": "Thanks! I’ll reply with details shortly.",
    "createdAt": "2025-08-01T10:00:00.000Z",
    "updatedAt": "2025-08-20T16:45:00.000Z"
  }
]
```


## 📚 Examples
- Minimal import file: `examples/canned-replies.sample.json`
- Full import file (with ids and timestamps): `examples/canned-replies.sample-full.json`

Use these as a starting point to structure your own import files.


## ✉️ Apple Mail Insertion
- What happens
  - Raycast closes its window, activates Mail, jumps to the top of the draft (⌘↑), pastes your template text without permanently changing your clipboard, and optionally sends (⌘⇧D).
- Requirements
  - Apple Mail must have a compose/reply window open and focused.
  - macOS permissions: System Settings → Privacy & Security → Accessibility (allow Raycast), and Automation (allow Raycast to control Mail).
- Notes
  - Each insert prepends text at the very top, above signatures and quoted text.
  - “Insert and Send” immediately sends the email; use carefully.
  - Clipboard: the extension uses paste in a way that restores your previous clipboard contents after insertion.


## 🔐 Privacy & Storage
- All templates are stored locally via Raycast LocalStorage under the key `canned-replies`.
- The extension makes no network requests.
- The clipboard is used transiently to insert text into Mail, and your previous clipboard contents are restored after pasting.


## ⌨️ Shortcuts
- Insert and Send: ↩︎ (Enter on selected item)
- Insert Without Sending: ⇧↩︎ (Shift+Enter)
- Create New Template: ⌘N
- Edit Template: ⌘E
- Duplicate Template: ⌘⇧D
- Open Action Panel: ⌘K (or →)

Tip: You can also set a global hotkey for the command in Raycast → Settings → Extensions → Canned Replies → Hotkey.


## 🛠️ Troubleshooting
- Nothing inserts in Mail
  - Ensure a draft is open and focused in Apple Mail.
  - Check macOS permissions (Accessibility and Automation for Raycast).
- “Import will replace all existing templates”
  - This is expected. Import replaces the entire list. Export first if you need a backup.
- Import failed
  - The file must be valid JSON and the top-level value must be an array. See examples above.
- “No templates to export”
  - Create or import at least one template before exporting.
- Hotkeys not working
  - Some shortcuts are per-action within Raycast. Ensure you’ve selected a template and opened the Action Panel (⌘K) where applicable.


## ⚠️ Known Limitations
- macOS and Apple Mail only. Other mail apps aren’t supported.
- Import is replace-only (no merge). Duplicate detection is not performed.


## 💬 Feedback
If you have suggestions or run into issues, please open an issue on the GitHub repository or share feedback via the Raycast Store page.


## 📄 License
MIT
