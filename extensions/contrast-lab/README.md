# Contrast Lab

A Raycast extension for checking color contrast. It does both WCAG 2 and the newer APCA model, takes colors in hex, RGB, HSL, or OKLCH, and when a pair fails it suggests the nearest passing color.

<img width="1000" height="625" alt="contrast-lab-1" src="https://github.com/user-attachments/assets/d8b8a0a9-2314-4c54-9dee-7f25ca8d6b61" />
<img width="1000" height="625" alt="contrast-lab-2" src="https://github.com/user-attachments/assets/16b955c5-efd2-4dfc-9a91-93bcdafa3852" />

## Install

[Install from the Raycast Store](https://www.raycast.com/fracazo/contrast-lab) - _link goes live once the listing is approved._

## Status

Shipped as one command: a form for the foreground and background colors (plus font size and weight) with a live readout that updates as you type, and a result view with a preview swatch, the WCAG AA/AAA tags, the APCA Lc, and a one-tap nearest-passing fix you can copy when the pair fails. It all wires into the pure, fully tested `analyze()` core below.

## The library

Everything lives in [`src/lib`](src/lib). It's pure TypeScript with no `@raycast/api` or React imports, so it runs under Node's test runner and could be dropped into any project.

| File | What it does |
| --- | --- |
| [`color.ts`](src/lib/color.ts) | parsing, OKLCH conversion, sRGB gamut mapping, formatting, luminance |
| [`wcag.ts`](src/lib/wcag.ts) | WCAG 2 ratio and AA/AAA checks |
| [`apca.ts`](src/lib/apca.ts) | signed APCA Lc and the font size/weight thresholds |
| [`fix.ts`](src/lib/fix.ts) | nearest passing color, found by searching lightness in OKLCH |
| [`contrast.ts`](src/lib/contrast.ts) | the entry point: `analyze(input)` |

### Usage

\`\`\`ts
import { analyze } from "./src/lib/contrast";

const result = analyze({
  foreground: "#ffa500",
  background: "#ffffff",
  fontSizePx: 16, // optional, defaults to 16
  fontWeight: 400, // optional, defaults to 400
});

result.wcag.ratio;        // 1.97
result.apca.lc;           // 37.69 (signed; negative means light text on a dark bg)
result.fixForWcagAA.hex;  // "#a56900", the nearest foreground that clears AA
\`\`\`

Both colors accept hex (3/4/6/8 digit), \`rgb()\`, \`hsl()\`, and \`oklch()\`. If either one can't be parsed, you get back \`{ valid: false }\` with an error message instead of garbage numbers.

## APCA notes

APCA returns a signed Lc value rather than a ratio: positive for dark text on a light background, negative for the reverse. Because it accounts for font size and weight, the pass/fail check needs both, which is why \`analyze()\` takes them. Small or thin text needs a higher Lc than large or bold text at the same colors.

## Tests

\`\`\`sh
npm install
npm test
\`\`\`

That runs \`node --import tsx --test "src/lib/**/*.test.ts"\`. The expected values are pinned to specific versions of culori, apca-w3, and colorparsley, so if a test fails it usually means one of those changed its output, not that the test is wrong.

## License

MIT
