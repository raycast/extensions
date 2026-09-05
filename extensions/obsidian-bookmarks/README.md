# Obsidian Bookmarks

> Manage your bookmarked links with Obsidian. Save, search, and access your bookmarks.

Obsidian Bookmarks lets you use Raycast and Obsidian as a place to manage your bookmarks.

Putting your bookmarks in Obsidian means that you can add your own metadata, including any notes or context about why you might be saving a link.

## Configuration

Obsidian Bookmarks supports the following preferences:

### Vault Path

The absolute path to your Obsidian vault. If you're storing the Vault in iCloud, this will be something like:

```
/Users/<name>/Library/Mobile Documents/iCloud~md~obsidian/Documents/<Vault>
```

### Bookmarks Subfolder

The subpath inside your vault where links should be saved to and searched from.

By default, bookmarks get saved into a folder called "Bookmarks" at the root level of your vault.

### Default Form Action

The default action to take whenever you save a new link to your bookmarks and press <kbd>⌘</kbd>+<kbd>⏎</kbd>.

If unchanged, the default action is "Open Obsidian", which will open the Obsidian app to your newly saved link. All possible options include:

- **Open Obsidian**: Open the obsidian app to your bookmark.
- **Copy Obsidian Link**: Copy the Obsidian link to your clipboard (as both rich and plain text).
- **Copy Obsidian Link as Markdown**: Copy the Obsidian link to your clipboard as a Markdown-style link.
- **Open Link**: Open the bookmarked link in your browser.
- **Copy Link**: Copy the bookmarked link to your clipboard (as both rich and plain text).
- **Copy Link as Markdown**: Copy the bookmarked link to your clipboard as a Markdown-style link.

### Default Item Action

The default action to take when browsing a list of your bookmarked links and you press <kbd>⏎</kbd>.

If unchanged, the default action is "Show Details", which will open a details panel view of your note in Obsidian.

See [Default Form Action](#default-form-action) for a list of other possible actions to pick from.

### Favicon Field

Search results show the favicon of each bookmarked website, falling back to a generic link icon when none can be found.

This preference names the frontmatter field used to override that favicon (default: `favicon`). Its value can either be another website, whose favicon is then used:

```yaml
---
title: "Some redirect"
source: "https://t.co/xxxxxxx"
favicon: "https://stripe.com"
---
```

...or a direct link to an image, which is used as-is. A value counts as an image when its path ends in `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`, `.bmp`, or `.avif`:

```yaml
favicon: "https://cdn.example.com/logos/acme.png"
```

The scheme is optional, so `favicon: notion.so` works too. Values that aren't `http(s)` URLs are ignored, and the icon falls back to the one derived from `source`.

Left blank, this preference falls back to `favicon`.

The **Save Bookmark** form exposes this as an optional "Favicon" dropdown. Type a URL into its search field and it becomes a selectable option, showing the icon it resolves to — so you can see the icon the bookmark will get before saving it. The first option always falls back to the bookmark's own URL.

Note that bookmarks are cached, so changing this preference (or an existing `favicon` value) only takes effect once the note is modified — run the **Clear Cache** command to refresh everything at once.

## Editing a Bookmark

The **Edit Bookmark** action (<kbd>⌘</kbd>+<kbd>E</kbd>) in your search results reopens the save form, prefilled from the note: its URL, title, favicon, tags and notes. **Update Bookmark** then writes your changes back to the same note.

The note keeps its filename, its original save date and its read state — only the fields shown in the form are rewritten, so Obsidian links to it keep working even if you change the title.

If the note starts with the `# [Title](url)` heading this extension generates, that heading is regenerated from the form and everything below it is what you edit in the "Notes" field. Notes you wrote yourself keep their body as-is.

## Screenshots

![Save a bookmark to Obsidian](./metadata/screenshot2.png)
![Search all your bookmarks in Obsidian](./metadata/screenshot3.png)
![View your bookmark notes](./metadata/screenshot4.png)
