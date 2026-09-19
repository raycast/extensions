# Duplicate Files

Duplicate the files and folders you have selected in Finder — either instantly, or with full control over what the copies are called.

Both commands work on the current Finder selection, so select something in Finder before running them. Folders are copied recursively, and a copy is never written over its own original.

## Commands

### Quick Duplicate

Copies the current Finder selection and gets out of the way.

- Takes an optional **Copies** argument. Leave it blank to use the default from preferences.
- Naming follows the scheme set in preferences: Finder style (`file copy`, `file copy 2`), or a plain number separated by a space, parentheses, a dash, or an underscore.
- Names already in use are skipped over, so a second run continues the sequence instead of colliding with it.

### Duplicate with Custom Names

A form for naming copies from a template, with a live preview of the resulting names.

| Field | What it does |
| --- | --- |
| Files | Pre-filled from the Finder selection; edit it with the picker |
| Name Template | The name pattern, with `{variables}` |
| Copies | How many copies of each selected item |
| Start At | The value `{n}` takes for the first copy |
| Padding | Minimum digits for `{n}` — `3` turns `7` into `007` |
| If the Name Exists | Add a number, skip the copy, or replace it |
| Destination | Where copies go; empty means next to the original |

Press `⌘ /` inside the form for the variable reference, or open the action panel for a few ready-made templates.

## Naming variables

| Variable | Description |
| --- | --- |
| `{name}` | Original name without the extension |
| `{ext}` | Original extension without the dot |
| `{base}` | Original name with the extension |
| `{parent}` | Name of the enclosing folder |
| `{n}` | Copy counter, padded by the Padding field |
| `{n:3}` | Copy counter padded to a set width |
| `{total}` | Number of copies being made |
| `{index}` / `{count}` | Position and size of the selection |
| `{date}` `{time}` `{datetime}` | Current date and time |
| `{year}` `{month}` `{day}` `{hour}` `{minute}` `{second}` | Individual parts |
| `{timestamp}` | Unix timestamp in seconds |
| `{rand}` / `{rand:8}` | Random string |
| `{uuid}` / `{uuid:short}` | Random UUID |

**Modifiers** apply to text variables: `upper`, `lower`, `title`, `kebab`, `snake`, `camel`, `pascal`, `trim` — for example `{name:snake}` or `{parent:kebab}`.

**Date formats** replace the modifier on date and time variables, using `YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh h mm m ss s A a` — for example `{date:dddd, MMMM D}` or `{time:hh-mm A}`.

A few details worth knowing:

- The original extension is appended automatically unless the template already contains `{ext}` or `{base}`.
- Write `{{` and `}}` for a literal brace.
- Characters that are illegal in file names, `/` included, become `-`, so a template can never write outside the destination folder.

## Examples

| Template | Result |
| --- | --- |
| `{name} copy {n}` | `Invoice copy 1.pdf` |
| `{name}-{n:3}` | `Invoice-001.pdf` |
| `{date} {name}` | `2026-09-06 Invoice.pdf` |
| `{name:snake}_v{n}` | `invoice_v1.pdf` |
| `{parent} - {name} ({n} of {total})` | `Documents - Invoice (1 of 5).pdf` |
| `{name}.{ext}.bak{n}` | `Invoice.pdf.bak1` |
