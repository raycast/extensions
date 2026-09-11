# I Ching Divination

A Raycast extension for performing I Ching divination using the traditional three-coin method. Consult the Book of Changes (易經) for guidance through all 64 hexagrams.

## Features

- **Interactive coin tossing**: Step-by-step generation of six lines with visual feedback and loading states
- **Three-coin method**: Simulates the traditional I Ching divination technique with randomized delays
- **Complete 64 hexagrams**: Includes Chinese names (漢字), pinyin romanization, and interpretations
- **Changing lines detection**: Identifies Old Yang (老陽) and Old Yin (老陰) lines that indicate transformation
- **Keyboard shortcuts**: Quick reset with `Cmd+R`

## Usage

1. Open Raycast and search for "I Ching Divination"
2. Press `Enter` to start the divination
3. Press `Enter` to toss coins for each line (6 tosses total)
4. View your hexagram result with:
   - Hexagram number and Chinese name
   - Pinyin pronunciation
   - Symbolic meaning (Heaven, Earth, Water, Fire, etc.)
   - Line-by-line breakdown showing changing lines
   - Interpretation and advice

## The Three-Coin Method

Each line is determined by tossing three coins:

| Result  | Line Type  | Changing? |
| ------- | ---------- | --------- |
| 3 heads | Old Yang   | Yes       |
| 2 heads | Young Yin  | No        |
| 1 head  | Young Yang | No        |
| 0 heads | Old Yin    | Yes       |

Changing lines (Old Yang and Old Yin) indicate areas of transformation in your situation.

## About I Ching

The I Ching (易經), or Book of Changes, is one of the oldest Chinese classics, used for over 3,000 years for divination and philosophical reflection. It contains 64 hexagrams, each composed of six lines (爻 yáo), representing different life situations and guidance.

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## License

MIT
