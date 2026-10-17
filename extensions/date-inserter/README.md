# Date Inserter

Pick a date from a keyboard-driven calendar and insert it at the cursor in any app, in your own format.

The Raycast edition of [Date Inserter for Obsidian](https://community.obsidian.md/plugins/date-inserter), by the same author: the same calendar, now available in every app on macOS.

## Usage

1. Place the cursor where you want the date.
2. Open **Insert Date** (assigning a hotkey in Raycast is recommended).
3. Move to the date and press <kbd>Enter</kbd>.

The text that will be inserted is shown at the top right of the calendar.

## Keyboard Shortcuts

### Calendar

| Shortcut | Action |
| --- | --- |
| <kbd>Enter</kbd> | Paste the date into the frontmost app |
| <kbd>⌘</kbd> <kbd>C</kbd> | Copy the date |
| <kbd>←</kbd> <kbd>→</kbd> | Previous / next day |
| <kbd>↑</kbd> <kbd>↓</kbd> | Previous / next week |
| <kbd>⌘</kbd> <kbd>[</kbd> / <kbd>⌘</kbd> <kbd>]</kbd> | Previous / next month |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>[</kbd> / <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>]</kbd> | Previous / next year |
| <kbd>⌘</kbd> <kbd>T</kbd> | Go to today |
| <kbd>⌘</kbd> <kbd>M</kbd> | Open the month view |
| <kbd>⌘</kbd> <kbd>Y</kbd> | Open the year view |
| <kbd>1</kbd> / <kbd>2</kbd> | Switch between date format 1 and 2 (when format 2 is set) |

Moving past the first or last day of a month turns the page to the neighboring month.

### Month and Year Views

| Shortcut | Action |
| --- | --- |
| Arrow keys | Move the selection |
| <kbd>Enter</kbd> | Choose the month or year |
| <kbd>⌘</kbd> <kbd>T</kbd> | Go to this month / year |
| <kbd>⌘</kbd> <kbd>Y</kbd> | Open the year view (from the month view) |
| <kbd>Esc</kbd> | Go back without changing anything |

## Preferences

| Preference | Description | Default |
| --- | --- | --- |
| Date Format 1 | Format of the inserted date | `yyyy-MM-dd` |
| Date Format 2 | Optional second format | — |
| Initial Format | Format selected when the calendar opens | Date Format 1 |
| Language | Language of the calendar and of names in the inserted date | English |
| Week Start | Sunday or Monday | Sunday |
| Week Numbers | Off, ISO 8601, Western Traditional, Middle Eastern, or Auto (Based on Week Start) | Off |

### Date Formats

Formats use [date-fns tokens](https://date-fns.org/docs/format), which follow the Unicode date patterns also used by Raycast snippets.

| Format | Example |
| --- | --- |
| `yyyy-MM-dd` | 2026-10-21 |
| `MM/dd/yyyy` | 10/21/2026 |
| `EEE, MMM d, yyyy` | Wed, Oct 21, 2026 |
| `EEEE, MMMM do` | Wednesday, October 21st |
| `yyyy年M月d日(EEE)` (Language: 日本語) | 2026年10月21日(水) |
| `'Q'Q yyyy` | Q4 2026 |

Wrap literal text in single quotes. If a format is invalid, the calendar shows "Invalid date format" and pressing <kbd>Enter</kbd> opens the format reference.

## Notes

- Dates can be selected from the year 1000 to 9999.
- If text is selected in the target app, it is replaced by the date, like a normal paste.
- Fields that block pasting, such as password fields, cannot receive the date.

## Development checks

Run `npm test`, `npm run typecheck` (generates the preference types before type-checking), and `npm run lint` before submitting changes.
