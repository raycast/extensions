# Tibia NPC Prices

> Quickly find the best NPC sell prices for Tibia items

A Raycast extension that helps Tibia players maximize their profits by showing which NPCs pay the most for each item.

![Tibia Gold Coin Icon](assets/command-icon.png)

## Features

🔍 **Search 1,601+ Items** - Comprehensive database of all tradeable items
💰 **Highest Prices** - Instantly see which NPC pays the most
📍 **NPC Locations** - Know exactly where to sell your loot
👥 **Multiple Buyers** - See all NPCs that buy each item (avg 3.5 per item)
🏷️ **Stackable Info** - Identify stackable items at a glance
📋 **Quick Copy** - Copy price info to clipboard with ⌘+C

## Installation

Install from the [Raycast Store](https://www.raycast.com/store) or manually:

```bash
git clone https://github.com/kjbakke/tibia-npc-prices.git
cd tibia-npc-prices
npm install
npm run dev
```

## Usage

1. Open Raycast (⌘ + Space)
2. Type `Search Item Prices` or start typing an item name
3. Browse items and see the highest NPC price instantly
4. Press **Enter** to view all NPCs that buy the item
5. Press **⌘ + C** to copy price information

### Example Searches

- `"Figurine"` - Browse ultra-valuable boss drops
- `"Dragon Scale Mail"` - Compare multiple NPC prices
- `"Amber"` - View gems with many buyers
- `"Gold Coin"` - See currency values

## Database

### Statistics

- **Total items:** 1,601
- **Price range:** 1 gp to 5,400,000 gp
- **Average buyers per item:** 3.5 NPCs
- **Items with 20+ buyers:** 84

### Top 10 Most Valuable Items

| Item | Price | NPC |
|------|-------|-----|
| Figurine of Bakragore | 5,400,000 gp | Yasir |
| Figurine of Megalomania | 5,000,000 gp | Yasir |
| Morshabaal's Brain | 5,000,000 gp | Yasir |
| Ancient Eye Stalk | 3,500,000 gp | Yasir |
| Darklight Figurine | 3,400,000 gp | Yasir |
| Morshabaal's Extract | 3,250,000 gp | Yasir |
| Putrefactive Figurine | 3,200,000 gp | Yasir |
| Figurine of Cruelty | 3,100,000 gp | Yasir |
| Figurine of Spite | 3,000,000 gp | Yasir |
| Figurine of Greed | 2,900,000 gp | Yasir |

### Most Active NPCs

| NPC | Items Bought |
|-----|--------------|
| Yasir | 786 |
| Rashid | 197 |
| H.L. | 124 |
| Rock in a Hard Place | 124 |
| Augustin | 109 |

## Data Source

All data is scraped from [TibiaWiki](https://tibia.fandom.com) using the [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page).

### Updating the Database

To refresh item data from TibiaWiki:

#### Full Update (1,601 items, ~20-25 minutes)
```bash
cd scraper
npm install
npm run scrape:category
```

#### Quick Update (834 creature products, ~1 minute)
```bash
cd scraper
npm run scrape
```

The scraper:
1. Fetches items from the [Items Bought by NPCs](https://tibia.fandom.com/wiki/Category:Items_Bought_by_NPCs) category
2. Parses each item's wiki page for NPC buyer information
3. Extracts prices, locations, and stackable status
4. Generates updated `src/data.ts` file

**Note:** Rate limited to 200ms between requests to respect TibiaWiki servers.

## Development

```bash
# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Project Structure

```
tibia-npc-prices/
├── src/
│   ├── search-item-prices.tsx  # Main Raycast command
│   └── data.ts                 # Item database (1,601 items)
├── scraper/
│   ├── scrape-category.js      # Full category scraper
│   ├── scraper.js              # Quick table scraper
│   └── package.json            # Scraper dependencies
├── assets/
│   ├── command-icon.png        # Gold Coin icon (512x512)
│   └── Gold_Coin.gif           # Original Tibia sprite
├── package.json                # Extension manifest
└── README.md                   # This file
```

## Technical Details

### Scraper Architecture

**Category Scraper** (`scrape-category.js`)
- Fetches all 1,624 items from wiki category
- Makes individual API calls for each item
- Parses HTML tables for NPC buy prices
- Handles pagination and rate limiting

**Table Scraper** (`scraper.js`)
- Directly parses creature products table
- Single API call
- Faster but limited to one category

### Data Format

```typescript
interface NPCBuyer {
  name: string;      // NPC name
  location: string;  // City or location
  price: number;     // Buy price in gold
}

interface TibiaItem {
  name: string;
  buyers: NPCBuyer[];
  stackable?: boolean;
}
```

## Contributing

Contributions are welcome! To add features or fix bugs:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Ideas for Contributions

- Add item images/sprites
- Support for player market prices
- Price history tracking
- Profit calculator
- Export to CSV/JSON

## Credits

- **Data Source:** [TibiaWiki](https://tibia.fandom.com)
- **Game:** [Tibia](https://www.tibia.com) by CipSoft GmbH
- **Icon:** Gold Coin sprite from Tibia
- **Built with:** [Raycast API](https://developers.raycast.com)

## License

MIT

---

## Disclaimer

This is an unofficial fan-made extension. Tibia is a registered trademark of CipSoft GmbH. This extension is not affiliated with or endorsed by CipSoft GmbH.

## Support

Found a bug or have a suggestion? [Open an issue](https://github.com/kjbakke/tibia-npc-prices/issues) on GitHub.

---

**Enjoy maximizing your profits in Tibia!** 💰🪙
