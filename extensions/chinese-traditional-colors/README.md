# Chinese Traditional Colors

Search, preview, and copy Chinese traditional colors in Raycast.

Chinese Traditional Colors is a Raycast extension by [Raffe Yang](https://github.com/RaffeYang). It includes 742 Chinese traditional colors with bilingual names, hue categories, common color formats, and harmony palette suggestions. It is designed for designers and developers who need to quickly find culturally rooted colors and copy them into design tools, CSS, or code.

Color data is generated from [`nevertoday/zhongguo-traditional-colors`](https://github.com/nevertoday/zhongguo-traditional-colors), specifically `docs/chinese-color-harmony.csv`.

## Features

- Browse Chinese traditional colors as large color swatches.
- Search by Chinese name, pinyin, color number, HEX, RGB, HSL, hue category, or palette relationship.
- Filter by hue, with neutral colors shown first by default.
- View details for each color, including HEX, RGB, CSS RGB, HSL, CSS HSL, CSS variables, hue, and temperature.
- Copy colors in HEX, RGB, HSL, CSS, CSS variable, or JSON formats.
- Explore harmony palettes such as similar, analogous, complementary, split complementary, triadic, tetradic, light, dark, muted, neutral, secondary, accent, and main/secondary/accent schemes.
- Save favorite colors and access recently copied colors.

## Commands

### Chinese Traditional Colors

Open the color browser. Press `Enter` to copy the configured default format, or open actions to view details, copy another format, favorite a color, or explore palettes.

## Preferences

### Default Copy Format

Choose the format copied by the primary action:

- HEX
- RGB
- CSS RGB
- HSL
- CSS HSL
- CSS Variable
- JSON

## Refreshing Data

To regenerate the bundled color data from the upstream CSV:

```bash
npm run refresh-data
```

The script downloads the source CSV and regenerates `src/color-data.ts`.

## Development

```bash
npm install
npm run dev
```

Before submitting changes, run:

```bash
npm test
npm run lint
npm run build
```

## Author

Created by [Raffe Yang](https://github.com/RaffeYang).

## Acknowledgements

Color data is based on [`nevertoday/zhongguo-traditional-colors`](https://github.com/nevertoday/zhongguo-traditional-colors).
