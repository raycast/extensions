# Tibia Wiki Scraper Guide

This guide explains how the scraper works and how to use it.

## Overview

The scraper extracts item and NPC buy price data from TibiaWiki using the MediaWiki API and HTML parsing.

## Two Scraping Methods

### Method 1: Category Scraper (Comprehensive)
**File:** `scraper/scrape-category.js`

**What it does:**
1. Fetches all items from the [Items Bought by NPCs](https://tibia.fandom.com/wiki/Category:Items_Bought_by_NPCs) category
2. For each item, fetches its individual wiki page
3. Parses the "Sell To" table to extract NPC names, locations, and prices
4. Checks item properties (stackable, etc.)

**Stats:**
- Items scraped: 1,601
- Time: ~20-25 minutes
- Request delay: 200ms between items

**Usage:**
```bash
cd scraper
npm run scrape:category
```

**Output:**
- `scraped-data-category.json` - Raw scraped data
- `../src/data.ts` - Generated TypeScript data file for Raycast

### Method 2: Table Scraper (Quick)
**File:** `scraper/scraper.js`

**What it does:**
1. Fetches the "Creature Products by NPC Price" wiki page
2. Parses the HTML table directly
3. Extracts item names, prices, NPCs, and stackable status

**Stats:**
- Items scraped: 834 (creature products only)
- Time: ~1-2 minutes
- Requests: 1 page

**Usage:**
```bash
cd scraper
npm run scrape
```

**Output:**
- `scraped-data.json` - Raw scraped data
- `../src/data.ts` - Generated TypeScript data file for Raycast

## How the Category Scraper Works

### Step 1: Fetch Category Members
Uses the MediaWiki API to get all items in the category:
```
https://tibia.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Items_Bought_by_NPCs
```

With pagination support to handle 1,600+ items.

### Step 2: Fetch Individual Item Pages
For each item, fetches its page via the parse API:
```
https://tibia.fandom.com/api.php?action=parse&page=ITEM_NAME&format=json
```

### Step 3: Parse HTML Tables
Uses Cheerio to parse the HTML and extract:
- The "Sell To" section (`#npc-trade-sellto`)
- The table with NPC, Location, and Price columns
- Stackable status from the infobox

### Step 4: Generate Output
Creates two files:
1. JSON file with raw data for analysis
2. TypeScript file for the Raycast extension

## Rate Limiting

The scraper includes a 200ms delay between requests to be respectful to TibiaWiki servers. This is configurable in the code:

```javascript
await new Promise(resolve => setTimeout(resolve, 200));
```

## Data Structure

### Input: Wiki HTML Table
```html
<table class="wikitable sortable">
  <tr>
    <th>NPC</th>
    <th>Location</th>
    <th>Price</th>
  </tr>
  <tr>
    <td><a href="/wiki/Rashid">Rashid</a></td>
    <td><a href="/wiki/Rashid">Varies</a></td>
    <td>40,000</td>
  </tr>
</table>
```

### Output: TypeScript Data
```typescript
{
  name: "Dragon Scale Mail",
  buyers: [
    {
      name: "Rashid",
      location: "Rashid",
      price: 40000
    }
  ]
}
```

## Troubleshooting

### "No price data" for an item
Some items in the category don't have NPC buyers listed on their pages. These are skipped.

### API Errors
If you get API errors, the wiki might be down or rate limiting. Try:
1. Increasing the delay between requests
2. Running the scraper at a different time

### Parse Errors
If the HTML structure changes, you may need to update the selectors in the scraper code.

## Future Improvements

Potential enhancements:
- Add support for NPC locations via separate API calls
- Cache item data to avoid re-fetching unchanged items
- Add progress bar UI
- Export to other formats (CSV, SQLite)
- Scrape additional item properties (weight, value, etc.)
