# LeetCode Zerotrac Raycast Extension

A Raycast extension that integrates Zerotrac's LeetCode problem difficulty ratings, providing a more accurate assessment of problem difficulty compared to the standard Easy/Medium/Hard classifications.

## Features

- **Search LeetCode Problems**: Quickly search through LeetCode problems by title, tags, difficulty, or rating
- **Zerotrac Ratings**: View accurate difficulty ratings calculated by Zerotrac based on contest statistics
- **Multiple Actions**: Open problems in browser, copy URLs, titles, or detailed problem information
- **Smart Sorting**: Problems are sorted by rating when available, helping you find appropriately challenging problems
- **Contest Information**: See which contest a problem originated from
- **Dual Language Support**: Open problems in both LeetCode.com and LeetCode.cn

## Usage

1. Open Raycast
2. Type "Search LeetCode Problems" or use the configured shortcut
3. Search for problems by:
   - Problem title (e.g., "Two Sum")
   - Tags (e.g., "Dynamic Programming")
   - Difficulty (e.g., "Medium")
   - Rating range (e.g., "1500")

## Keyboard Shortcuts

- `Enter` - Open in LeetCode.com
- `Cmd + C` - Open in LeetCode.cn (Chinese)
- `Cmd + T` - Copy problem title
- `Cmd + I` - Copy detailed problem information
- `Cmd + R` - Copy Zerotrac rating

## Rating System

The extension uses Zerotrac's rating system which calculates problem difficulty based on contest participant statistics:

- **Green (< 1200)**: Beginner level
- **Yellow (1200-1600)**: Intermediate level  
- **Orange (1600-2000)**: Advanced level
- **Red (> 2000)**: Expert level

## Data Source

Problem ratings are fetched from the official Zerotrac repository:
https://github.com/zerotrac/leetcode_problem_rating

## Installation

### From Raycast Store
Search for "LeetCode Zerotrac" in the Raycast Store and install directly.

### Manual Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to develop locally
4. Or run `npm run build` and import into Raycast

### Building and Publishing
```bash
# Build for production
npm run build

# Publish to Raycast Store (requires approval)
npm run publish
```

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```