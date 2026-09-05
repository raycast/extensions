# Color Contrast Checker

Check the [WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) contrast ratio between two colors and see whether they pass **AA** and **AAA** — right from Raycast. No setup, no account.

## Features

- **Live contrast ratio** as you type
- **Pass / fail** for AA and AAA, for normal text, large text, and UI components
- **Pick a color** — grab one from the screen (eyedropper) or choose visually on a color wheel (requires the free [Color Picker](https://raycast.com/thomas/color-picker) extension)
- **Smart suggestions** — nudge the foreground to the nearest color that passes AA or AAA
- **Flexible input** — HEX (`#1a1a1a`), RGB (`rgb(26 26 26)`), HSL (`hsl(0 0% 10%)`), HSB (`hsb(0 0 10)`), CMYK (`cmyk(0 0 0 90)`), and CSS color names (`black`), including alpha
- **See each color as HEX, RGB, HSB, and CMYK** in the result panel
- **Swap colors** and **copy** the report or hex values

## Usage

Run **Check Contrast**, enter a foreground and background color, and the result updates instantly. You can also pass both colors as arguments when launching the command.

### WCAG thresholds

| Level | Normal text | Large text | UI & graphics |
| ----- | ----------- | ---------- | ------------- |
| AA    | 4.5:1       | 3:1        | 3:1           |
| AAA   | 7:1         | 4.5:1      | –             |

_Large text means 18pt (24px) or 14pt (18.66px) bold and larger._
