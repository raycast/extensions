# Persian Tools

A Raycast extension providing essential productivity tools for Persian (Farsi) users: fixing text typed on the wrong keyboard layout, converting Persian and Arabic digits to English digits, and converting Jalali (Shamsi) dates.

## Commands

### Fix Keyboard Layout

Convert text typed on the wrong keyboard layout between English (US) and Persian. You can provide an argument, select text in any application, or copy text to the clipboard. The auto-detected direction is shown first, with the opposite conversion shown second.

- Actions: **Paste** (primary, ↵) and **Copy to Clipboard** (⌘↵).

### Fix Selected Text Layout

A no-view command that directly transforms the selected text in the active application and pastes back the converted layout (`US → Persian` or `Persian → US`).

- Automatically detects the source layout direction and preserves non-alphabetic keys.

### Convert Persian Digits

Convert Persian (`۰–۹`) and Arabic-Indic (`٠–٩`) digits to English digits (`0–9`), including Persian decimal (`٫` → `.`) and thousands (`٬` → `,`) separators while stripping invisible bidirectional control marks.

- Reads input from argument, selected text, or clipboard.
- Actions: **Paste** (primary, ↵) and **Copy to Clipboard** (⌘↵).

### Jalali Date

Convert between Jalali (Shamsi) and Gregorian dates, displaying the Persian long format with Persian digits, Jalali numeric (`YYYY/MM/DD`), Gregorian long format, Gregorian ISO (`YYYY-MM-DD`), and relative time distance.

- Actions: **Copy to Clipboard** (primary, ↵) and **Paste** (⌘↵).

#### Accepted Jalali Date Inputs

- **Empty input**: Defaults to today's date.
- **Relative offsets**: `+10`, `-5`, `+2w`, `-1w`, `+30d`.
- **Numeric dates** (using `/`, `-`, or `.`):
  - Jalali (years 1–3177): `1403/5/12`, `1405-07-14`, `1399.1.1`.
  - Gregorian (years ≥ 1700): `2024-08-02`, `2026/10/06`.
- **Day and Month Name** (optional year):
  - Persian month names (Persian script or Latin transliteration): `۱۲ مرداد`, `14 mehr`, `14 mehr 1403`, `فروردین 1`, `tir 15`.
  - Gregorian month names: `August 2`, `2nd August`, `6 October 2026`, `oct 6`.

## Keyboard Layout Mapping

Layout conversion maps between the standard macOS Persian layout (`com.apple.keylayout.Persian-ISIRI2901`) and the standard macOS US keyboard layout (`com.apple.keylayout.US`).
