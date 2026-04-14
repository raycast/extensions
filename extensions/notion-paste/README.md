# Notion Field Paste

Search any Notion database from Raycast and paste a field value directly into the active app — all without leaving the keyboard.

Notion is a trademark of Notion Labs, Inc. This extension is not affiliated with or endorsed by Notion.

---

## How it works

1. **Invoke** the `Notion Field Paste` command from Raycast.
2. **Type** to search — results filter in real time against your configured search property.
3. **Select** a record and press `↵` to open the field picker.
4. **Select** a field and press `↵` — the value is pasted at your cursor position and copied to the clipboard.

---

## Prerequisites

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Click **"New integration"**, give it a name (e.g. _Raycast Picker_), and select your workspace.
3. Under **Capabilities**, enable **"Read content"** (write is not needed).
4. Copy the **Internal Integration Token** — it starts with `secret_…`.

### 2. Share your databases with the integration

For **each** Notion database you want to use:

1. Open the database in Notion.
2. Click the **"…"** menu (top right) → **"Connections"** → search for your integration → **"Confirm"**.

### 3. Find your Database IDs

The database ID is the part of the URL between the last `/` and the `?`.

```
https://www.notion.so/myworkspace/897e5a76ae524b489fdf...?v=...
                                  ^^^^^^^^^^^^^^^^^^^^^^^^
                                  This is your Database ID
```

---

## Installation

```sh
# 1 — install dependencies
cd notion-paste
npm install

# 2 — run in development mode (opens Raycast automatically)
npm run dev
```

Raycast will prompt you to fill in the required preferences the first time you run each command.

---

## Configuration

All configuration lives in **Raycast → Preferences → Extensions → Notion Field Paste**. Nothing is stored in code.

### Extension-level (shared by all commands)

| Preference         | Type     | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| **Notion API Key** | Password | Your integration token (`secret_…`). Stored securely in the macOS Keychain. |

### Command (database picker)

| Preference         | Type | Description                                                                                                                                                                                                                    |
| ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Databases JSON** | Text | JSON array of database configs. Each entry needs: `label`, `databaseId`, `searchProperty`, `searchPropertyType`, `displayProperties`, `pickerProperties`, and optional `filterProperty`, `filterPropertyType`, `filterValues`. |

#### Build your JSON in a text editor (recommended)

The JSON can get long. It is easier to build and edit it in a text editor, then paste it into the Raycast preference field.

1. Copy the template below into a text editor (VS Code, Sublime, etc.).
2. Fill in each database entry.
3. Paste the full JSON into **Raycast → Extensions → Notion Field Paste → Command Preferences → Databases JSON**.

Template:

```json
[
  {
    "label": "Ops",
    "databaseId": "897e5a76ae524b489fdf...",
    "searchProperty": "Name",
    "searchPropertyType": "title",
    "displayProperties": "Status, Owner",
    "pickerProperties": "Slug, URL",
    "filterProperty": "Status",
    "filterPropertyType": "status",
    "filterValues": "Fixed, Pending"
  },
  {
    "label": "Orders",
    "databaseId": "abcd1234...",
    "searchProperty": "Order ID",
    "searchPropertyType": "rich_text",
    "displayProperties": "Status, Customer",
    "pickerProperties": "Order ID, Reference"
  }
]
```

#### Field reference

Each database entry supports:

| Field                | Required | Notes                                                        |
| -------------------- | -------- | ------------------------------------------------------------ |
| `label`              | Yes      | Display name in the database picker list.                    |
| `databaseId`         | Yes      | The Notion database ID from the URL.                         |
| `searchProperty`     | Yes      | Property name to search on (case-sensitive).                 |
| `searchPropertyType` | Yes      | `title` or `rich_text`. Must match the Notion property type. |
| `displayProperties`  | Yes      | Comma-separated property names shown as tags in results.     |
| `pickerProperties`   | Yes      | Comma-separated property names available to paste.           |
| `filterProperty`     | No       | Optional property to pre-filter results (e.g. `Status`).     |
| `filterPropertyType` | No       | `status` or `select`. Defaults to `status`.                  |
| `filterValues`       | No       | Comma-separated values to include when filtering.            |

---

## Adding more databases

Add another entry to the `Databases JSON` array in the command preferences. Each entry is independent with its own database ID and field configuration.

---

## Supported Notion property types

The following property types are supported for both display and pasting:

| Type                            | What is shown/pasted                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| Title                           | Plain text                                                        |
| Rich Text                       | Plain text (formatting stripped)                                  |
| Number                          | Numeric string                                                    |
| Select                          | Selected option name                                              |
| Multi-select                    | Comma-separated option names                                      |
| Status                          | Status name                                                       |
| Date                            | Start date (or `start → end` for ranges)                          |
| Checkbox                        | `✓` or `✗`                                                        |
| URL                             | URL string                                                        |
| Email                           | Email address                                                     |
| Phone Number                    | Phone number string                                               |
| Formula                         | Result as string (works for text, number, boolean, date formulas) |
| Rollup                          | Result as string                                                  |
| People / Created by / Edited by | Person name(s)                                                    |
| Created time / Last edited time | Formatted date                                                    |
| Files                           | File name(s)                                                      |
| Relation                        | Count of linked pages                                             |
| Unique ID                       | Full ID with prefix (e.g. `OPS-42`)                               |

---

## Keyboard shortcuts

### Search view

| Key     | Action                                |
| ------- | ------------------------------------- |
| `↵`     | Open field picker for selected record |
| `⌘ O`   | Open the record in Notion             |
| `⌘ ⇧ C` | Copy the record URL                   |

### Field picker view

| Key   | Action                                              |
| ----- | --------------------------------------------------- |
| `↵`   | **Paste** value into active app + copy to clipboard |
| `⌘ C` | Copy to clipboard only (no paste)                   |
| `⌘ O` | Open the record in Notion                           |

---

## Project structure

```
notion-paste/
├── src/
│   ├── components/
│   │   ├── notion-search.tsx   # Main search list (shared by all commands)
│   │   └── field-picker.tsx    # Second-level field picker view
│   ├── notion-api.ts           # Notion API client + property value extractor
│   ├── types.ts                # TypeScript interfaces
│   ├── utils.ts                # parsePropertyList, useDebounce hook
│   └── notion-databases.tsx    # Command: Pick a database, then search
├── assets/
│   └── extension-icon.png      # 512×512 PNG extension icon (add your own)
├── package.json                # Extension manifest + dependencies
└── tsconfig.json
```

---

## Development

```sh
npm run dev       # Live-reload development mode
npm run build     # Production build (also runs type checks)
npm run lint      # ESLint check
npm run fix-lint  # ESLint auto-fix
```

---

## Troubleshooting

**"Invalid Notion API Key"** — The token is wrong or has been revoked. Regenerate it at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and update the extension preferences.

**"Database Not Found"** — Either the Database ID is wrong, or the integration hasn't been shared with that database. See _Prerequisites → Share your databases_ above.

**A property shows as empty** — The property name in preferences must match Notion **exactly**, including capitalisation and spaces. Check the column header in Notion.

**Results are slow** — The Notion API typically responds in 200–800 ms. Results are debounced by 300 ms to avoid hammering the API on every keystroke.
