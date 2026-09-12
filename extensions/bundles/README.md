# Bundles

Organize applications, websites, and nested collections into custom bundles — accessible instantly from Raycast.

Launchpad folders meets browser bookmarks, but faster and right in your command bar.

---

## Features

### Bundle Management

- **Custom bundles** — Group apps, websites, and other bundles into collections
- **Nesting** — Create hierarchical structures; navigate with breadcrumb paths like `Work → Tools → Utilities`
- **Custom icons** — Pick from 100+ Raycast icons per bundle
- **Custom colors** — Tint icons with CSS names (`coral`, `skyblue`) or hex codes (`#FF5733`, `FF5733`)
- **Default color** — Set a default color applied to every new bundle

### Websites

- **Auto favicon** — Fetched automatically via Raycast's built-in provider; falls back to a globe icon if unavailable
- **Auto titles** — Page titles are fetched automatically, or use `[Custom Title](https://example.com)` for your own
- **Open all** — Launch every website in a bundle at once with `⌘⇧O`

### Display

- **List or Grid view** for bundle contents
- **Preview pane** — See what's inside a bundle without opening it
- **Separate sections** — Group apps, websites, and nested bundles into labeled sections
- **Tri-level sorting** — Primary, secondary, and tertiary sort (alphabetical, length, recency, or none)

### Copy & Share

- **Copy as Markdown** (`⌘⇧M`) — Hierarchical bullet list with nested bundle structure
- **Copy as List** (`⌘⇧L`) — Flat URL list, sorted by length
- Both include URLs from nested bundles recursively

### Backup & Restore

- **Export** a single bundle or all bundles to JSON (also copied to clipboard)
- **Import** with merge or replace-all modes
- Exports include your preferences (sort order, view type, display settings)

### Quicklinks

Pin any bundle to Raycast's root search:

1. Select a bundle → `⌘⇧C` → save
2. Search for it directly without opening the extension first

Copy the deeplink URL with `⌘⌥C` for sharing or scripting.

---

## Keyboard Shortcuts

### Bundle List

| Shortcut | Action                            |
| -------- | --------------------------------- |
| `↵`      | Open bundle                       |
| `⌘N`     | Create new bundle                 |
| `⌘E`     | Edit bundle                       |
| `⌘O`     | Open all apps                     |
| `⌘⇧O`    | Open all websites                 |
| `⌘⇧M`    | Copy URLs as markdown             |
| `⌘⇧L`    | Copy URLs as list                 |
| `⌘⇧C`    | Create quicklink                  |
| `⌘⌥C`    | Copy quicklink URL                |
| `⌘⇧E`    | Export bundle                     |
| `⌃⇧X`    | Empty bundle (remove all items)   |
| `⌃X`     | Delete bundle                     |

### Bundle Contents

| Shortcut | Action                                        |
| -------- | --------------------------------------------- |
| `↵`      | Open item                                     |
| `⌘E`     | Edit item (website or nested bundle)          |
| `⌘M`     | Move item to another bundle                   |
| `⌘D`     | Duplicate item                                |
| `⌘O`     | Open all apps                                 |
| `⌘⇧O`    | Open all websites                             |
| `⌘⇧M`    | Copy URLs as markdown                         |
| `⌘⇧L`    | Copy URLs as list                             |
| `⌘⇧Q`    | Quit all running apps                         |
| `⌘⌫`     | Remove item                                   |

---

## Getting Started

### Create a Bundle

1. Open Raycast → search **"Bundles"**
2. `⌘N` to create a new bundle
3. Name it, pick an icon, optionally set a color
4. Select apps and/or add website URLs (one per line)
5. `⌘↵` to save

### Add Websites

Plain URLs auto-fetch titles. Use markdown links for custom names:

```
https://github.com
[Raycast Store](https://raycast.com/store)
[My Projects](https://github.com/username)
```

### Nest Bundles

Edit a bundle (`⌘E`) → select existing bundles in the **"Nested Bundles"** field, or choose **"Create New Bundle..."** to create and nest in one step.

Bundles can only have one parent — a bundle already nested elsewhere won't appear in the picker.

### Move Items

Select any item inside a bundle → `⌘M` → choose a destination.

### Export & Import

- **Export:** Select a bundle → `⌘⇧E` (or use "Export All Bundles" from the action panel). Saved to Downloads + clipboard.
- **Import:** "Import Bundles" from the action panel → paste JSON → choose **Merge** or **Replace All**.

---

## Preferences

Configure via Raycast Settings → Extensions → Bundles.

**Sorting** — Up to three levels of priority for bundle contents:

| Method       | Options                    |
| ------------ | -------------------------- |
| Alphabetical | A → Z or Z → A            |
| Length       | Short → Long or vice versa |
| Recent       | Old → New or vice versa    |
| None         | Preserve order             |

**Display** — List or Grid view, preview pane toggle, separate sections for apps/websites/bundles.

**Appearance** — Default bundle color (CSS name or hex).

---

## FAQ

<details>
<summary><strong>Where is my data stored?</strong></summary>

If you have iCloud Drive enabled, bundles are stored in `~/iCloud Drive/Raycast Bundles/bundles.json` and sync automatically across your Macs. If iCloud Drive is unavailable, data is stored locally via Raycast's LocalStorage.

</details>

<details>
<summary><strong>Do bundles sync across Macs?</strong></summary>

Yes — if iCloud Drive is enabled, bundles sync automatically. Existing data is migrated to iCloud on first run. You can also manually export/import bundles as JSON backups.

</details>

<details>
<summary><strong>Why isn't my favicon loading?</strong></summary>

Favicons are fetched via Raycast's built-in provider. If it can't find one, a globe icon is shown instead.

</details>

<details>
<summary><strong>What color formats work?</strong></summary>

CSS names (`coral`, `skyblue`), hex with hash (`#FF5733`), and hex without hash (`FF5733`).

</details>

---

## Development

```bash
npm install        # Install dependencies
npm run dev        # Development mode (hot reload)
npm run build      # Build for production
npm run fix-lint   # Fix linting issues
npm run publish    # Publish to store
```

Requires **Raycast** 1.69.0+, **Node.js** 20+, **macOS**.

---

## Privacy

- Data stored in iCloud Drive (syncs across Macs) or Raycast LocalStorage as fallback
- Only accesses applications you explicitly add
- AppleScript used solely for detecting running apps
- No third-party servers, no tracking, no analytics

---

## License

MIT
