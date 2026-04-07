# Bundles

> Organize applications, websites, and bundles into custom collections accessible directly from Raycast.

Think of it as Launchpad folders meets browser bookmarks, but faster, more powerful, and right in your command bar.

---

## FAQ

<details>
<summary><strong>Where is my data stored?</strong></summary>

All data is stored locally using Raycast's LocalStorage. Nothing is sent to external servers. Favicons are cached locally in `~/Library/Application Support/com.raycast.macos/extensions/bundles/`.

</details>

<details>
<summary><strong>Can I sync bundles across multiple Macs?</strong></summary>

Not automatically, but you can use **Export All Bundles** to create a backup JSON, then **Import Bundles** on another Mac. The JSON is also copied to your clipboard for easy transfer.

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
<summary><strong>Can bundles be nested multiple levels deep?</strong></summary>

Yes! You can nest bundles inside other nested bundles. The breadcrumb path shows your location like `Work → Tools → Utilities`.

</details>

<details>
<summary><strong>How do I move an item to a different bundle?</strong></summary>

Select any item inside a bundle and press `⌘M` to open the move dialog. Choose a destination and the item is moved instantly.

</details>

<details>
<summary><strong>What color formats are supported?</strong></summary>

CSS color names (`coral`, `skyblue`), hex with hash (`#FF5733`), hex without hash (`FF5733`), and shorthand hex (`F53` → `#FF5533`).

</details>

<details>
<summary><strong>How do I pin a bundle to Raycast's root search?</strong></summary>

Create a **Quicklink** for the bundle:

1. Select your bundle in the list
2. Press `⌘⇧C` (Create Quicklink)
3. Give it a name and save

Now you can search for that bundle directly from Raycast's root search without opening the Bundles extension first. Your bundle's custom icon is automatically applied to the quicklink.

</details>

---

## Table of Contents

> **Note:** Links below work on GitHub but not on the Raycast Store website.

- [Features](#features)
  - [Bundle Management](#-bundle-management)
  - [Website Support](#-website-support)
  - [Smart Search & Navigation](#-smart-search--navigation)
  - [Display Options](#-display-options)
  - [Copy & Share](#-copy--share)
  - [Backup & Restore](#-backup--restore)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Preferences](#preferences)
- [Usage Guide](#usage-guide)
  - [Creating Your First Bundle](#creating-your-first-bundle)
  - [Adding Websites](#adding-websites)
  - [Organizing with Nested Bundles](#organizing-with-nested-bundles)
  - [Copying URLs](#copying-urls)
  - [Moving Items Between Bundles](#moving-items-between-bundles)
  - [Creating Quicklinks](#creating-quicklinks)
  - [Exporting & Importing](#exporting--importing)
- [Development](#development)
- [Privacy](#privacy)
- [License](#license)

---

## Features

### Bundle Management

| Feature             | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| **Custom Bundles**  | Group applications, websites, and other bundles into organized collections |
| **Nested Bundles**  | Create hierarchical bundle structures for deeper organization              |
| **Custom Icons**    | Choose from 100+ Raycast icons to personalize each bundle                  |
| **Custom Colors**   | Tint bundle icons with CSS color names or hex codes                        |
| **Default Color**   | Configure a default color for all newly created bundles                    |

#### Supported Color Formats

You can specify bundle colors in multiple formats:

| Format          | Example   | Result    |
| --------------- | --------- | --------- |
| CSS color name  | `coral`   | `#FF7F50` |
| Hex (with #)    | `#FF5733` | `#FF5733` |
| Hex (without #) | `FF5733`  | `#FF5733` |

**Common CSS colors:** `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `coral`, `gold`, `crimson`, `indigo`, `teal`, `navy`, `skyblue`, `salmon`, `turquoise`, `violet`, and [80+ more](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color).

### Website Support

| Feature             | Description                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Add URLs**        | Include website bookmarks in any bundle                                                             |
| **Auto Favicon**    | Favicons fetched from 6 sources in parallel (Google, DuckDuckGo, Icon Horse, Yandex, direct, Apple) |
| **Refresh Favicon** | Manually re-fetch favicon with `⌘R` if it didn't load correctly                                     |
| **Auto Titles**     | Page titles are fetched automatically from websites                                                 |
| **Custom Titles**   | Use markdown syntax `[Title](URL)` for custom names                                                 |
| **Edit Websites**   | Modify website names and URLs after adding                                                          |
| **Open All**        | Launch all websites in a bundle at once                                                             |

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
- Custom titles are preserved when editing bundles

### Smart Search & Navigation

| Feature              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| **Instant Search**   | Find bundles with Raycast's blazing-fast fuzzy search     |
| **Breadcrumb Paths** | See full navigation paths like `Work → Tools → Utilities` |
| **Section Grouping** | Top-level and nested bundles are displayed separately     |
| **Recent Access**    | Items track when they were last accessed for sorting      |

### Display Options

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **List View**         | Classic list with icons, titles, and subtitles           |
| **Grid View**         | Visual grid layout for browsing                          |
| **Preview Pane**      | Side panel showing bundle contents without opening       |
| **Separate Sections** | Group apps, websites, and bundles into labeled sections  |
| **Item Counts**       | See how many items are in each section                   |

### Copy & Share

| Feature                     | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| **Copy as Markdown**        | Copy bundle URLs as bullet points with nested structure  |
| **Copy as List**            | Copy all URLs as a plain list, sorted by length          |
| **Includes Nested Bundles** | Recursively includes URLs from all nested bundles        |

### Backup & Restore

| Feature                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| **Export Single Bundle**  | Export one bundle (including nested bundles) to JSON             |
| **Export All Bundles**    | Create a complete backup of all bundles                          |
| **Import Bundles**        | Restore from backup with merge or replace options                |
| **Clipboard Copy**        | Exports are also copied to clipboard for easy sharing            |
| **Preferences Included** | Exports include your sort order, view type, and display settings |

---

## Keyboard Shortcuts

### From the Bundle List

| Shortcut | Action                              |
| -------- | ----------------------------------- |
| `↵`      | Open selected bundle                |
| `⌘N`     | Create new bundle                   |
| `⌘E`     | Edit selected bundle                |
| `⌘O`     | Open all applications in bundle     |
| `⌘⇧O`    | Open all websites in bundle         |
| `⌘⇧M`    | Copy all URLs as markdown           |
| `⌘⇧L`    | Copy all URLs as list               |
| `⌘⇧C`    | Create quicklink to bundle          |
| `⌘⌥C`    | Copy quicklink URL                  |
| `⌘⇧E`    | Export selected bundle              |
| `⌃⇧X`    | Empty bundle (remove all contents)  |
| `⌃X`     | Delete bundle                       |

### From Bundle Contents

| Shortcut | Action                                         |
| -------- | ---------------------------------------------- |
| `↵`      | Open selected item                             |
| `⌘E`     | Edit selected item (website or nested bundle)  |
| `⌘R`     | Refresh favicon (websites only)                |
| `⌘M`     | Move item to another bundle                    |
| `⌘D`     | Duplicate item                                 |
| `⌘O`     | Open all applications                          |
| `⌘⇧O`    | Open all websites                              |
| `⌘⇧M`    | Copy all URLs as markdown                      |
| `⌘⇧L`    | Copy all URLs as list                          |
| `⌘⇧Q`    | Quit all running applications                  |
| `⌘⌫`     | Remove item from bundle                        |

---

## Preferences

Access preferences via Raycast Settings → Extensions → Bundles.

### Sorting

Configure up to three levels of sorting priority for bundle contents:

| Level                 | Purpose                         |
| --------------------- | ------------------------------- |
| **Primary Sort**      | Main sorting method             |
| **Secondary Sort**    | Tiebreaker when items are equal |
| **Tertiary Sort**     | Final tiebreaker                |

**Available sort methods:**

| Method       | Options                     |
| ------------ | --------------------------- |
| Alphabetical | A → Z, Z → A                |
| Length       | Short → Long, Long → Short  |
| Recent       | Old → New, New → Old        |
| None         | No sorting (preserve order) |

### Display

| Preference            | Description                                   |
| --------------------- | --------------------------------------------- |
| **View Type**         | List or Grid view for bundle contents         |
| **Preview Pane**      | Show bundle contents in a side panel          |
| **Separate Sections** | Group apps, websites, and bundles separately  |

### Appearance

| Preference               | Description                                      |
| ------------------------ | ------------------------------------------------ |
| **Default Bundle Color** | Hex color to pre-fill when creating new bundles  |

---

## Usage Guide

### Creating Your First Bundle

1. Open Raycast and search for **"Bundles"**
2. Press `⌘N` to create a new bundle
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

### Organizing with Nested Bundles

1. Edit an existing bundle (`⌘E`) or create a new one
2. In the **"Nested Bundles"** field, select existing bundles to nest
3. Or choose **"Create New Bundle..."** to create and nest in one step
4. The new bundle is automatically added to the parent

**Note:** Bundles can only have one parent. A bundle already nested elsewhere won't appear in the selection.

### Copying URLs

You can copy all URLs from a bundle (including nested bundles) in two formats:

#### Copy as Markdown (`⌘⇧M`)

Produces a hierarchical bullet list. If the bundle contains nested bundles, it includes the root bundle name:

**Bundle without nested bundles:**

```markdown
- https://github.com
- https://raycast.com
- https://google.com
```

**Bundle with nested bundles:**

```markdown
- **My Bundle**
  - https://github.com
  - https://raycast.com
  - **Subbundle**
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

### Moving Items Between Bundles

1. Select any item inside a bundle
2. Press `⌘M` to open the move dialog
3. Choose a destination bundle (shows both top-level and nested bundles)
4. The item is moved instantly

### Creating Quicklinks

Quicklinks let you open specific bundles directly from Raycast:

1. Select a bundle in the list
2. Press `⌘⇧C` to create a quicklink
3. Your bundle's custom icon is automatically applied
4. Save and access the bundle instantly from anywhere

You can also copy the deeplink URL with `⌘⌥C` for sharing or scripting.

### Exporting & Importing

#### Exporting

1. Select a bundle and press `⌘⇧E` to export it (includes nested bundles)
2. Or use **"Export All Bundles"** from the action panel
3. A JSON file is saved to Downloads and copied to clipboard

#### Importing

1. Select **"Import Bundles"** from any bundle's action panel
2. Paste your backup JSON
3. Choose import mode:
   - **Merge**: Add new bundles, keep existing ones
   - **Replace All**: Delete all existing bundles first

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
├── folder-contents.tsx    # Bundle contents view
├── folder-edit-form.tsx   # Create/edit bundle form
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

- Stores all data locally using Raycast's LocalStorage
- Caches favicons locally for performance
- Only accesses applications you explicitly add
- Uses AppleScript solely for detecting running apps
- Does **not** send any data to external servers
- Does **not** track usage or analytics

---

## License

MIT License — Free to use, modify, and distribute.

---

<p align="center">
  <strong>Made with love for Raycast</strong>
</p>
