# Tibia Helper

> Your essential companion for Tibia - NPC prices, Rashid tracking, and imbuement guides

A Raycast extension that helps Tibia players with essential game information including NPC sell prices, Rashid's location, and imbuement materials.

## Features

### 🔍 Search Item NPC Price
- **1,601+ Items** - Comprehensive database of all tradeable items
- **Highest Prices** - Instantly see which NPC pays the most
- **NPC Locations** - Know exactly where to sell your loot
- **Multiple Buyers** - See all NPCs that buy each item
- **Stackable Info** - Identify stackable items at a glance
- **Quick Copy** - Copy price info to clipboard

### 📍 Rashid Location
- **Current Location** - See which city Rashid is in today
- **Countdown Timer** - Know exactly when he moves
- **Weekly Schedule** - View Rashid's full rotation (Monday-Sunday)
- **Exact Locations** - Detailed tavern/building locations in each city
- **Timezone Support** - Automatic CET/CEST handling

### ⚗️ Search Imbuements
- **24 Imbuements** - Complete database covering all categories
- **All Tiers** - Basic, Intricate, and Powerful versions
- **Material Lists** - Exact quantities for each tier
- **Equipment Types** - See which items can use each imbuement
- **Search by Name** - Find by display name or actual imbuement name

## Installation

Install from the [Raycast Store](https://www.raycast.com/store) or manually:

```bash
git clone https://github.com/kjbakke/tibia-helper.git
cd tibia-helper
npm install
npm run dev
```

## Usage

### Search Item NPC Price

1. Open Raycast (⌘ + Space)
2. Type `Search Item NPC Price` or start typing an item name
3. Browse items and see the highest NPC price instantly
4. Press **Enter** to view all NPCs that buy the item
5. Press **⌘ + C** to copy price information

**Example Searches:**
- `"Figurine"` - Browse ultra-valuable boss drops
- `"Dragon Scale Mail"` - Compare multiple NPC prices
- `"Amber"` - View gems with many buyers

### Rashid Location

1. Open Raycast (⌘ + Space)
2. Type `Rashid Location`
3. See current location, next location, and countdown
4. View the full weekly schedule

### Search Imbuements

1. Open Raycast (⌘ + Space)
2. Type `Search Imbuements` or start typing an imbuement name
3. Select an imbuement to see all tiers
4. View materials needed for each tier
5. Press **⌘ + C** to copy material info

**Example Searches:**
- `"Strike"` - Critical hit imbuement
- `"Vampirism"` - Life leech imbuement
- `"Ice Protection"` - Quara Scale protection

## Database Statistics

### Item Prices
- **Total items:** 1,601
- **Price range:** 1 gp to 5,400,000 gp
- **Average buyers per item:** 3.5 NPCs
- **Most active NPC:** Yasir (786 items)

### Rashid Schedule

| Day | City | Location |
|-----|------|----------|
| Monday | Svargrond | Dankwart's tavern, south of temple |
| Tuesday | Liberty Bay | Lyonel's tavern, west of depot |
| Wednesday | Port Hope | Clyde's tavern, west of depot |
| Thursday | Ankrahmun | Arito's tavern, above post office |
| Friday | Darashia | Miraia's tavern, south of guildhalls |
| Saturday | Edron | Mirabell's tavern, above depot |
| Sunday | Carlin | Depot, one floor above |

### Imbuements

**24 Total Imbuements across 9 categories:**
- Elemental Damage (5): Fire, Ice, Energy, Earth, Death
- Leech (2): Life Leech, Mana Leech
- Critical (1): Strike
- Protection (5): Fire, Ice, Energy, Earth, Death, Holy
- Skill Boost (6): Club, Axe, Sword, Distance, Magic Level, Shielding
- Defense (1): Blockade
- Utility (3): Speed, Capacity, HP
- Paralysis (1): Vibrancy

## Data Source

All data is sourced from [TibiaWiki](https://tibia.fandom.com):
- Item prices via [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page)
- Rashid schedule from official game mechanics
- Imbuement data from the [Imbuing page](https://tibia.fandom.com/wiki/Imbuing)

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

# Publish to Raycast
npm run publish
```

## Project Structure

```
tibia-helper/
├── src/
│   ├── search-item-prices.tsx  # NPC price search command
│   ├── rashid-location.tsx     # Rashid location command
│   ├── search-imbuements.tsx   # Imbuements search command
│   ├── data.ts                 # Item database (1,601 items)
│   └── imbuements-data.ts      # Imbuements database (24 imbuements)
├── assets/
│   └── extension_icon.png        # Tibia icon (512x512)
├── package.json                # Extension manifest
└── README.md                   # This file
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
- More Tibia utilities (calculators, timers, etc.)
- Bestiary information
- Quest tracker

## Credits

- **Data Source:** [TibiaWiki](https://tibia.fandom.com)
- **Game:** [Tibia](https://www.tibia.com) by CipSoft GmbH
- **Icon:** Official Tibia icon
- **Built with:** [Raycast API](https://developers.raycast.com)

## License

MIT

---

## Disclaimer

This is an unofficial fan-made extension. Tibia is a registered trademark of CipSoft GmbH. This extension is not affiliated with or endorsed by CipSoft GmbH.

## Support

Found a bug or have a suggestion? [Open an issue](https://github.com/kjbakke/tibia-helper/issues) on GitHub.

---

**Happy hunting in Tibia!** ⚔️
