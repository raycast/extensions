# Web Converter

Convert common web units and color formats in Raycast. Type a value in the search bar and copy any matching conversion from the list.

## Spacing

Converts between **rem**, **px**, and **pt**, and maps values to the nearest [Tailwind CSS spacing scale](https://tailwindcss.com/docs/customizing-spacing) (v3.3.2).

| Input example | Outputs                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `16px`        | rem, pt, Tailwind spacing (e.g. `4`) or arbitrary value (e.g. `[16px]`) |
| `1rem`        | px, pt, Tailwind spacing                                                |
| `12pt`        | rem, px                                                                 |

**Base pixel size:** rem ↔ px conversions use a configurable base font size (default **16px**). Change it in extension preferences under **Base PX Value**.

## Colors

Converts between **hex**, **rgb**, **hsl**, and **oklch**, including alpha/opacity where supported. For opaque colors, the extension also suggests the closest **Tailwind CSS** palette color.

### Supported inputs

**Hex**

- `#006699` — 6-digit
- `#069` — 3-digit shorthand
- `#00669980` — 8-digit with alpha

**RGB / RGBA** (comma-separated)

- `rgb(0, 102, 153)`
- `rgba(0, 102, 153, 0.5)`

**HSL / HSLA** (comma- or space-separated, modern CSS syntax)

- `hsl(200, 100%, 30%)`
- `hsl(200 100% 30%)`
- `hsl(200 100% 30% / 0.5)`
- `hsl(200 100% 30% / 50%)` — alpha as percentage
- `hsla(200, 100%, 30%, 0.5)`

**OKLCH**

- `oklch(0.45 0.12 240)`
- `oklch(45% 0.12 240)` — lightness as percentage

### Outputs

Depending on the input, you may see:

- hex / hexa
- rgb / rgba
- hsl / hsla
- oklch
- closest Tailwind color (name or hex)

Click any result to copy it to the clipboard.

## Usage

1. Open Raycast and run **Convert Unit**.
2. Type a spacing or color value (e.g. `22px`, `#006699`, `hsl(200 100% 30%)`).
3. Pick a conversion from the list and copy it.

## Platforms

macOS and Windows.
