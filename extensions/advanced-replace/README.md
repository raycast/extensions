# Advanced Replace

Extract and transform the current selection (or clipboard) with your own saved regex rules, then paste or copy the result. Manage rules in one place, or bind any rule to a global hotkey.

## Replacement types

- **Direct Replace** — search & replace directly in the text. Supports capture-group backreferences (`$1`, `$&`), case transforms (`\U…\E`, `\L…\E`, `\u`, `\l`), escapes (`\n`, `\t`, `\r`), and per-item flags: global, multiline, case-insensitive.
- **Cut Paste** — extract named values with regex and insert them into an output template using `{key}` placeholders.

## Managing rules

Open **Extract and Replace Text** to create, edit, duplicate, reorder, and delete rules. A rule can hold multiple regex items, and the list can be sorted by Recent, Alphabetical, or Manual order.

Per-rule actions: Run and Paste / Run and Copy, Edit (`⌘E`), Duplicate (`⌘D`), Assign to Quick Slot (`⌘⇧S`), Delete (`⌃X`).

## Quick Slots

Bind a rule to a global hotkey with the six **Quick Slot** commands:

1. In **Extract and Replace Text**, select a rule and run **Assign to Quick Slot** (`⌘⇧S`); pick a slot (1–6).
2. In Raycast, open the **Quick Slot N** command and assign a Hotkey or Alias.

The hotkey runs that rule against the selection (or clipboard) with no UI. Each slot's **Result Action** preference pastes (default) or copies, and deleting a rule frees its slot.

## Example — Markdown image → HTML

A **Cut Paste** rule that turns `![alt](src)` into an `<img>` tag.

Output template:

```
<img src="{src}" alt="{alt}" width="400" height="300">
```

| Key   | Regex              |
| ----- | ------------------ |
| `src` | `\!\[.*\]\((.*)\)` |
| `alt` | `\!\[(.*)\]`       |

<video autoplay muted loop src="./media/github-image-replacement.mp4"></video>
