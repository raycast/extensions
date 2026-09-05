# Create Barcode

Generate a barcode as you type in the search bar, preview it instantly, and export it as PNG or SVG.

Supports EAN-13, ITF, NW-7 (Codabar), CODE39 and CODE128. Every symbology that can encode your input is listed, so you can compare them with the arrow keys and switch between them. Enter 12 digits for EAN-13 and the check digit is calculated for you.

## Usage

1. Run `Create Barcode` in Raycast
2. Type a code into the search bar
3. Pick a symbology from the list on the left to see its preview on the right
4. Export it from the Action Panel

Use the search bar dropdown (`⌘P`) to pin a single symbology. The default is **Auto Detect**.

## Supported Symbologies

| Symbology   | Accepted Input                                                                    |
| ----------- | --------------------------------------------------------------------------------- |
| **EAN-13**  | 12 or 13 digits (the check digit is calculated when 12 are given)                   |
| **ITF**     | Digits (a leading `0` is added when the length is odd)                              |
| **NW-7**    | Digits and `-` `$` `:` `/` `.` `+`, wrapped in an `A`–`D` start/stop pair           |
| **CODE39**  | Digits, uppercase letters and `-` `.` space `$` `/` `+` `%`                         |
| **CODE128** | Printable ASCII                                                                     |

EAN-13 and ITF also accept input containing hyphens, spaces and full-width digits (`4912-3456 7890` becomes `4912345678904`).

Values are limited to 80 characters (80 digits for ITF). CODE128 and CODE39 have no length limit in their specifications, but a symbol that long is already too wide for real scanners to read.

## Preferences

- **Save Folder** — where PNG / SVG files are written. Defaults to the Downloads folder when empty.
- **PNG Scale** — pixels per barcode module in exported PNG files (2x / 4x / 6x / 8x).

## Output Specification

- **EAN-13** — standard dimensions: 69X bar height, 11X left and 7X right quiet zones, guard bars extended by 5X
- **ITF / NW-7 / CODE39** — 3:1 wide-to-narrow bar ratio, 10X quiet zones on both sides
- **CODE128** — 11X per symbol (13X for the stop symbol), 10X quiet zones on both sides
