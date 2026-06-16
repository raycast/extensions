# Regex Replace

Replace the current selection or clipboard entry using custom regex entries.

## Quick Slots

Bind any saved entry to a global hotkey using the six **Quick Slot** commands:

1. Open **Extract and Replace Text** and select an entry.
2. Run **Assign to Quick Slot** (`⌘⇧S`) and pick a slot (1–6).
3. In Raycast, open the **Quick Slot N** command's settings and assign a Hotkey or Alias.

Triggering that hotkey runs the assigned entry against the current selection (or clipboard) without opening any UI. Each slot has a **Result Action** preference to either Paste (default) or Copy the result. Deleting an entry automatically frees any slot it occupied.

## Examples

### Github Image Replacements

Replace the markdown version of an image with the HTML `<img>` version.

#### Output

```
<img src="{src}" alt="{alt}" width="400" height="300">
```

#### Item 1 - key: src

```
\!\[.*\]\((.*)\)
```

#### Item 2 - key: alt

```
\!\[(.*)\]
```

<video autoplay muted looped src="./media/github-image-replacement.mp4">
