# Folders

> Organize applications, websites, and folders into custom collections accessible directly from Raycast.

Think of it as Launchpad folders meets browser bookmarks, but faster, more powerful, and right in your command bar.

---

## ❓ FAQ

<details>
<summary><strong>Where is my data stored?</strong></summary>

All data is stored locally using Raycast's LocalStorage. Nothing is sent to external servers. Favicons are cached locally in `~/Library/Application Support/com.raycast.macos/extensions/folders/`.

</details>

<details>
<summary><strong>Can I sync folders across multiple Macs?</strong></summary>

Not automatically, but you can use **Export All Folders** to create a backup JSON, then **Import Folders** on another Mac. The JSON is also copied to your clipboard for easy transfer.

</details>

<details>
<summary><strong>Why isn't my favicon loading?</strong></summary>

The extension tries 6 different favicon sources in parallel. If all fail, a globe icon is shown instead. You can manually refresh by selecting the website and pressing `⌘R` (Refresh Favicon).

</details>

<details>
<summary><strong>How do I add a website with a custom name?</strong></summary>

Use markdown link syntax: `[My Custom Name](https://example.com)`. Plain URLs will auto-fetch the page title instead.

</details>

<details>
<summary><strong>Can folders be nested multiple levels deep?</strong></summary>

Yes! You can nest folders inside other nested folders. The breadcrumb path shows your location like `Work → Tools → Utilities`.

</details>

<details>
<summary><strong>How do I move an item to a different folder?</strong></summary>

Select any item inside a folder and press `⌘M` to open the move dialog. Choose a destination and the item is moved instantly.

</details>

<details>
<summary><strong>What color formats are supported?</strong></summary>

CSS color names (`coral`, `skyblue`), hex with hash (`#FF5733`), hex without hash (`FF5733`), and shorthand hex (`F53` → `#FF5533`).

</details>

<details>
<summary><strong>How do I pin a folder to Raycast's root search?</strong></summary>

Create a **Quicklink** for the folder:

1. Select your folder in the list
2. Press `⌘⇧C` (Create Quicklink)
3. Give it a name and save

Now you can search for that folder directly from Raycast's root search without opening the Folders extension first. Your folder's custom icon is automatically applied to the quicklink.

</details>

---

## Table of Contents

> **Note:** Links below work on GitHub but not on the Raycast Store website.

- [Features](#features)
  - [Folder Management](#-folder-management)
  - [Website Support](#-website-support)
  - [Smart Search & Navigation](#-smart-search--navigation)
  - [Display Options](#-display-options)
  - [Copy & Share](#-copy--share)
  - [Backup & Restore](#-backup--restore)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Preferences](#preferences)
- [Usage Guide](#usage-guide)
  - [Creating Your First Folder](#creating-your-first-folder)
  - [Adding Websites](#adding-websites)
  - [Organizing with Nested Folders](#organizing-with-nested-folders)
  - [Copying URLs](#copying-urls)
  - [Moving Items Between Folders](#moving-items-between-folders)
  - [Creating Quicklinks](#creating-quicklinks)
  - [Exporting & Importing](#exporting--importing)
- [Development](#development)
- [Privacy](#privacy)
- [License](#license)

---

## Features

### 📁 Folder Management

| Feature            | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **Custom Folders** | Group applications, websites, and other folders into organized collections |
| **Nested Folders** | Create hierarchical folder structures for deeper organization              |
| **Custom Icons**   | Choose from 100+ Raycast icons to personalize each folder                  |
| **Custom Colors**  | Tint folder icons with CSS color names or hex codes                        |
| **Default Color**  | Configure a default color for all newly created folders                    |

#### Supported Color Formats

You can specify folder colors in multiple formats:

| Format          | Example   | Result    |
| --------------- | --------- | --------- |
| CSS color name  | `coral`   | `#FF7F50` |
| Hex (with #)    | `#FF5733` | `#FF5733` |
| Hex (without #) | `FF5733`  | `#FF5733` |

**Common CSS colors:** `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `coral`, `gold`, `crimson`, `indigo`, `teal`, `navy`, `skyblue`, `salmon`, `turquoise`, `violet`, and [80+ more](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color).

### 🌐 Website Support

| Feature             | Description                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Add URLs**        | Include website bookmarks in any folder                                                             |
| **Auto Favicon**    | Favicons fetched from 6 sources in parallel (Google, DuckDuckGo, Icon Horse, Yandex, direct, Apple) |
| **Refresh Favicon** | Manually re-fetch favicon with `⌘R` if it didn't load correctly                                     |
| **Auto Titles**     | Page titles are fetched automatically from websites                                                 |
| **Custom Titles**   | Use markdown syntax `[Title](URL)` for custom names                                                 |
| **Edit Websites**   | Modify website names and URLs after adding                                                          |
| **Open All**        | Launch all websites in a folder at once                                                             |

#### Markdown Link Syntax

When adding websites, you can use markdown link syntax to specify custom titles:

```
https://github.com
[My Projects](https://github.com/username)
[Raycast Store](https://raycast.com/store)
https://google.com
```

- Plain URLs auto-fetch the page title
- `[Title](URL)` uses your custom title instead
- Custom titles are preserved when editing folders

### 🔍 Smart Search & Navigation

| Feature              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| **Instant Search**   | Find folders with Raycast's blazing-fast fuzzy search     |
| **Breadcrumb Paths** | See full navigation paths like `Work → Tools → Utilities` |
| **Section Grouping** | Top-level and nested folders are displayed separately     |
| **Recent Access**    | Items track when they were last accessed for sorting      |

### 📋 Display Options

| Feature               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **List View**         | Classic list with icons, titles, and subtitles          |
| **Grid View**         | Visual grid layout for browsing                         |
| **Preview Pane**      | Side panel showing folder contents without opening      |
| **Separate Sections** | Group apps, websites, and folders into labeled sections |
| **Item Counts**       | See how many items are in each section                  |

### 📋 Copy & Share

| Feature                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| **Copy as Markdown**        | Copy folder URLs as bullet points with nested structure |
| **Copy as List**            | Copy all URLs as a plain list, sorted by length         |
| **Includes Nested Folders** | Recursively includes URLs from all nested folders       |

### 💾 Backup & Restore

| Feature                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Export Single Folder** | Export one folder (including nested folders) to JSON             |
| **Export All Folders**   | Create a complete backup of all folders                          |
| **Import Folders**       | Restore from backup with merge or replace options                |
| **Clipboard Copy**       | Exports are also copied to clipboard for easy sharing            |
| **Preferences Included** | Exports include your sort order, view type, and display settings |

---

## Keyboard Shortcuts

### From the Folder List

| Shortcut | Action                             |
| -------- | ---------------------------------- |
| `↵`      | Open selected folder               |
| `⌘N`     | Create new folder                  |
| `⌘E`     | Edit selected folder               |
| `⌘O`     | Open all applications in folder    |
| `⌘⇧O`    | Open all websites in folder        |
| `⌘⇧M`    | Copy all URLs as markdown          |
| `⌘⇧L`    | Copy all URLs as list              |
| `⌘⇧C`    | Create quicklink to folder         |
| `⌘⌥C`    | Copy quicklink URL                 |
| `⌘⇧E`    | Export selected folder             |
| `⌃⇧X`    | Empty folder (remove all contents) |
| `⌃X`     | Delete folder                      |

### From Folder Contents

| Shortcut | Action                                        |
| -------- | --------------------------------------------- |
| `↵`      | Open selected item                            |
| `⌘E`     | Edit selected item (website or nested folder) |
| `⌘R`     | Refresh favicon (websites only)               |
| `⌘M`     | Move item to another folder                   |
| `⌘D`     | Duplicate item                                |
| `⌘O`     | Open all applications                         |
| `⌘⇧O`    | Open all websites                             |
| `⌘⇧M`    | Copy all URLs as markdown                     |
| `⌘⇧L`    | Copy all URLs as list                         |
| `⌘⇧Q`    | Quit all running applications                 |
| `⌘⌫`     | Remove item from folder                       |

---

## Preferences

Access preferences via Raycast Settings → Extensions → Folders.

### Sorting

Configure up to three levels of sorting priority for folder contents:

| Level                 | Purpose                         |
| --------------------- | ------------------------------- |
| **🥇 Primary Sort**   | Main sorting method             |
| **🥈 Secondary Sort** | Tiebreaker when items are equal |
| **🥉 Tertiary Sort**  | Final tiebreaker                |

**Available sort methods:**

| Method       | Options                     |
| ------------ | --------------------------- |
| Alphabetical | A → Z, Z → A                |
| Length       | Short → Long, Long → Short  |
| Recent       | Old → New, New → Old        |
| None         | No sorting (preserve order) |

### Display

| Preference            | Description                                  |
| --------------------- | -------------------------------------------- |
| **View Type**         | List or Grid view for folder contents        |
| **Preview Pane**      | Show folder contents in a side panel         |
| **Separate Sections** | Group apps, websites, and folders separately |

### Appearance

| Preference               | Description                                     |
| ------------------------ | ----------------------------------------------- |
| **Default Folder Color** | Hex color to pre-fill when creating new folders |

---

## Usage Guide

### Creating Your First Folder

1. Open Raycast and search for **"Folders"**
2. Press `⌘N` to create a new folder
3. Enter a name (e.g., "Work Apps")
4. Choose an icon from the dropdown
5. Optionally set a custom color (e.g., `coral`, `skyblue`, or `#3498db`)
6. Select applications to include
7. Add website URLs (one per line)
8. Press `⌘↵` to save

### Adding Websites

You can add websites in two ways:

**Plain URLs** — Titles are fetched automatically:

```
https://github.com
https://raycast.com
https://google.com
```

**Markdown Links** — Specify custom titles:

```
[GitHub](https://github.com)
[Raycast](https://raycast.com)
[Search](https://google.com)
```

Mix and match as needed. Favicons are cached locally for fast loading.

### Organizing with Nested Folders

1. Edit an existing folder (`⌘E`) or create a new one
2. In the **"Nested Folders"** field, select existing folders to nest
3. Or choose **"Create New Folder..."** to create and nest in one step
4. The new folder is automatically added to the parent

**Note:** Folders can only have one parent. A folder already nested elsewhere won't appear in the selection.

### Copying URLs

You can copy all URLs from a folder (including nested folders) in two formats:

#### Copy as Markdown (`⌘⇧M`)

Produces a hierarchical bullet list. If the folder contains nested folders, it includes the root folder name:

**Folder without nested folders:**

```markdown
- https://github.com
- https://raycast.com
- https://google.com
```

**Folder with nested folders:**

```markdown
- **My Folder**
  - https://github.com
  - https://raycast.com
  - **Subfolder**
    - https://docs.github.com
    - https://api.github.com
```

#### Copy as List (`⌘⇧L`)

Produces a flat list sorted by URL length (shortest first):

```
https://google.com
https://github.com
https://raycast.com
https://docs.github.com
```

### Moving Items Between Folders

1. Select any item inside a folder
2. Press `⌘M` to open the move dialog
3. Choose a destination folder (shows both top-level and nested folders)
4. The item is moved instantly

### Creating Quicklinks

Quicklinks let you open specific folders directly from Raycast:

1. Select a folder in the list
2. Press `⌘⇧C` to create a quicklink
3. Your folder's custom icon is automatically applied
4. Save and access the folder instantly from anywhere

You can also copy the deeplink URL with `⌘⌥C` for sharing or scripting.

### Exporting & Importing

#### Exporting

1. Select a folder and press `⌘⇧E` to export it (includes nested folders)
2. Or use **"Export All Folders"** from the action panel
3. A JSON file is saved to Downloads and copied to clipboard

#### Importing

1. Select **"Import Folders"** from any folder's action panel
2. Paste your backup JSON
3. Choose import mode:
   - **Merge**: Add new folders, keep existing ones
   - **Replace All**: Delete all existing folders first

---

## Development

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run dev

# Build for production
npm run build

# Fix linting issues
npm run fix-lint

# Publish to store
npm run publish
```

### Requirements

- **Raycast** 1.69.0+
- **Node.js** 20+
- **macOS** (required for application launching)

### Project Structure

```
src/
├── index.tsx              # Main command entry point
├── folder-contents.tsx    # Folder contents view
├── folder-edit-form.tsx   # Create/edit folder form
├── storage.ts             # LocalStorage operations
├── types.ts               # TypeScript interfaces
├── utils.ts               # Utility functions
├── favicon.ts             # Favicon fetching & caching
├── form-utils.ts          # Form helpers & URL parsing
├── backup.ts              # Export/import functions
├── constants.ts           # Shared constants
├── components/            # Reusable components
│   ├── add-items-form.tsx
│   ├── folder-item-actions.tsx
│   ├── folder-preview-detail.tsx
│   ├── import-folders-form.tsx
│   ├── move-to-folder-form.tsx
│   └── website-edit-form.tsx
└── hooks/                 # Custom React hooks
    ├── use-applications.ts
    ├── use-folders.ts
    ├── use-nested-folder-creation.tsx
    ├── use-preferences.ts
    └── use-running-apps.ts
```

---

## Privacy

This extension:

- ✅ Stores all data locally using Raycast's LocalStorage
- ✅ Caches favicons locally for performance
- ✅ Only accesses applications you explicitly add
- ✅ Uses AppleScript solely for detecting running apps
- ❌ Does **not** send any data to external servers
- ❌ Does **not** track usage or analytics

---

## License

MIT License — Free to use, modify, and distribute.

---

## 🎉 Fun Extras

A few hidden conveniences you might enjoy:

| Feature           | What it does                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **"dot" → "."**   | Type `discorddotcom` and it becomes `discord.com`. Works for any TLD: `jadotmt` → `ja.mt` |
| **Shorthand hex** | Type `F53` instead of `#FF5533` — it auto-expands                                         |
| **CSS colors**    | Use `coral` or `skyblue` instead of memorizing hex codes                                  |

---

<p align="center">
  <strong>Made with ❤️ for Raycast</strong>
</p>
