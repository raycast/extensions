# Phone Number Utils

Six commands to identify, format, and extract international phone numbers — entirely offline, no API required.

## Commands

### Identify Phone Country
Type or paste any phone number to instantly see its origin country, flag, and international dial code. Supports any format (`+33 6 12 34 56 78`, `0033…`, `(212) 555-0100`, etc.). Pre-fills from selected text or clipboard.

### Format Phone Number
Show a phone number in all applicable formats at once:
- **Digits Only** — stripped of all formatting
- **E.164** — `+33612345678`
- **US Format** — `(212) 555-0100` (US/Canada numbers only)
- **RFC 3966** — `tel:+33612345678`

Copy or paste any format in one keystroke.

### Extract Phone Numbers
Extracts every phone number found in your selected text or clipboard and shows each one with its country flag. Supports mixed international and local formats in the same block of text.

### Look Up Country Code
Search the full list of ~230 countries by name or dial code to find the international dialing prefix. Type `france`, `+33`, or `1` — results are scored by relevance.

### Format as US Number *(no-view)*
Reads from selection or clipboard, formats as `(XXX) XXX-XXXX`, and copies back silently.

### Remove Formatting *(no-view)*
Strips all spaces, dashes, dots, and parentheses from a phone number in selection or clipboard.

## How It Works

All country data (~230 entries) is hardcoded following [ITU-T E.164](https://www.itu.int/rec/T-REC-E.164/). Prefix matching uses longest-prefix-wins so NANP countries (`+1242` Bahamas, `+1876` Jamaica, …) resolve correctly before the generic `+1` US/Canada entry.
