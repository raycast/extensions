import * as cheerio from 'cheerio';
import fs from 'fs';

// Wiki pages to scrape (using page names for API)
// Only including pages with actual NPC prices, not just "sell to" lists
const WIKI_PAGES = [
  'Creature_Products_by_NPC_Price_and_Price_to_Weight_Ratio',
  // Note: "Valuables_Products_by_NPC_to_sell_to" doesn't have prices
  // Note: Equipment pages like "Armors_by_NPC_to_Sell_To" also don't have prices
];

const API_URL = 'https://tibia.fandom.com/api.php';

// Map to store all items and their NPC prices
const itemsMap = new Map();

/**
 * Fetch wiki page content using MediaWiki API
 */
async function fetchWikiPage(pageName) {
  try {
    const url = `${API_URL}?action=parse&page=${encodeURIComponent(pageName)}&format=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TibiaWikiScraper/1.0)',
      },
    });
    const data = await response.json();

    if (data.error) {
      console.error(`API Error:`, data.error);
      return null;
    }

    return data.parse?.text?.['*'] || null;
  } catch (error) {
    console.error(`Error fetching ${pageName}:`, error.message);
    return null;
  }
}

/**
 * Parse item data from tables on wiki pages
 */
function parseItemTable($, tableName = '') {
  console.log(`\nParsing table: ${tableName}`);

  // Find all tables on the page
  const tables = $('table.wikitable, table.sortable');
  console.log(`Found ${tables.length} tables with class wikitable or sortable`);

  // Also try other table selectors
  const allTables = $('table');
  console.log(`Found ${allTables.length} total tables`);

  tables.each((tableIndex, table) => {
    const $table = $(table);
    const headers = [];

    // Get headers
    $table.find('tr').first().find('th').each((i, th) => {
      headers.push($(th).text().trim());
    });

    console.log(`Table ${tableIndex} headers:`, headers);

    // Process each row
    $table.find('tr').slice(1).each((rowIndex, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length === 0) return;

      // Extract item name (usually first column with a link)
      const itemCell = cells.first();
      const itemLink = itemCell.find('a').first();
      const itemName = itemLink.attr('title') || itemLink.text().trim() || itemCell.text().trim();

      if (!itemName || itemName === '') return;

      // Try to find NPC and price information
      let npcNames = '';
      let npcLocation = '';
      let price = 0;
      let stackable = false;

      cells.each((cellIndex, cell) => {
        const $cell = $(cell);
        const cellText = $cell.text().trim();
        const header = headers[cellIndex] || '';

        // Check if item is stackable
        if (header.toLowerCase().includes('stackable')) {
          stackable = cellText.includes('✓') || cellText.toLowerCase().includes('yes');
        }

        // Look for price columns
        if (header.toLowerCase().includes('npc price')) {
          const priceMatch = cellText.match(/(\d+(?:,\d+)*)/);
          if (priceMatch) {
            price = parseInt(priceMatch[1].replace(/,/g, ''));
          }
        }

        // Look for NPC columns
        if (header.toLowerCase().includes('sell to')) {
          npcNames = cellText;
        }

        // Look for location columns
        if (header.toLowerCase().includes('location') ||
            header.toLowerCase().includes('city')) {
          const locationLink = $cell.find('a').first();
          npcLocation = locationLink.attr('title') || locationLink.text().trim() || cellText;
        }
      });

      // If we have item name and price, add it
      if (itemName && price > 0) {
        if (!itemsMap.has(itemName)) {
          itemsMap.set(itemName, {
            name: itemName,
            buyers: [],
            ...(stackable && { stackable: true })
          });
        }

        const item = itemsMap.get(itemName);

        // Update stackable if not set
        if (stackable && !item.stackable) {
          item.stackable = true;
        }

        // Split multiple NPCs and add each as a buyer
        if (npcNames) {
          // Split by comma and clean up
          const npcList = npcNames.split(',').map(n => {
            // Remove price info like "Tom: 5" -> "Tom"
            return n.replace(/:\s*\d+/, '').trim();
          }).filter(n => n.length > 0);

          for (const npcName of npcList) {
            // Check if this buyer already exists
            const existingBuyer = item.buyers.find(b =>
              b.name === npcName && b.price === price
            );

            if (!existingBuyer) {
              item.buyers.push({
                name: npcName,
                location: npcLocation || 'Multiple cities',
                price: price
              });
            }
          }
        }
      }
    });
  });
}

/**
 * Scrape individual item pages to get complete NPC buyer information
 */
async function scrapeItemPage(itemName) {
  const url = `https://tibia.fandom.com/wiki/${encodeURIComponent(itemName.replace(/ /g, '_'))}`;
  console.log(`Scraping item page: ${url}`);

  const html = await fetchPage(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const buyers = [];

  // Look for the "Sold by" or "Bought by" section in infobox
  const infobox = $('.infoboxtable, .infobox');

  infobox.find('tr').each((i, row) => {
    const $row = $(row);
    const header = $row.find('th').text().trim().toLowerCase();

    if (header.includes('sold for') || header.includes('sell to')) {
      const value = $row.find('td').text().trim();
      const priceMatch = value.match(/(\d+(?:,\d+)*)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ''));
        // This is a general NPC price, we'll need to find specific NPCs
        console.log(`  Found general price: ${price}`);
      }
    }
  });

  // Look for NPC trade tables
  $('.npc_trade, .npc-trade, table.wikitable').each((i, table) => {
    const $table = $(table);
    // Check if table has "Buyer" or "Sells for" information
    // This would require more detailed parsing
  });

  return buyers;
}

/**
 * Main scraper function
 */
async function scrapeAll() {
  console.log('Starting Tibia Wiki scraper...\n');

  for (const pageName of WIKI_PAGES) {
    console.log(`\nFetching page: ${pageName}`);
    const html = await fetchWikiPage(pageName);

    if (!html) {
      console.log(`Failed to fetch ${pageName}`);
      continue;
    }

    console.log(`Fetched HTML length: ${html.length} characters`);

    const $ = cheerio.load(html);
    parseItemTable($, pageName);

    // Add delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Convert map to array
  const items = Array.from(itemsMap.values()).map(item => ({
    ...item,
    buyers: item.buyers.sort((a, b) => b.price - a.price) // Sort by price descending
  }));

  // Filter out items with no buyers
  const validItems = items.filter(item => item.buyers.length > 0);

  console.log(`\n\nScraped ${validItems.length} items with NPC prices`);
  console.log(`Sample items:`, validItems.slice(0, 5).map(i => i.name));

  // Save to JSON file
  const output = {
    scrapedAt: new Date().toISOString(),
    totalItems: validItems.length,
    items: validItems
  };

  fs.writeFileSync('scraped-data.json', JSON.stringify(output, null, 2));
  console.log('\nData saved to scraped-data.json');

  // Generate TypeScript data file
  generateTypeScriptFile(validItems);
}

/**
 * Generate TypeScript data file
 */
function generateTypeScriptFile(items) {
  const tsContent = `// Auto-generated from Tibia Wiki scraper
// Generated at: ${new Date().toISOString()}
// Total items: ${items.length}

export interface NPCBuyer {
  name: string;
  location: string;
  price: number;
}

export interface TibiaItem {
  name: string;
  buyers: NPCBuyer[];
  stackable?: boolean;
}

export const tibiaItems: TibiaItem[] = ${JSON.stringify(items, null, 2)};

export function getHighestPrice(item: TibiaItem): NPCBuyer | null {
  if (item.buyers.length === 0) return null;
  return item.buyers.reduce((highest, current) =>
    current.price > highest.price ? current : highest
  );
}

export function getAllBuyersSorted(item: TibiaItem): NPCBuyer[] {
  return [...item.buyers].sort((a, b) => b.price - a.price);
}
`;

  fs.writeFileSync('../src/data.ts', tsContent);
  console.log('TypeScript data file generated at ../src/data.ts');
}

// Run the scraper
scrapeAll().catch(console.error);
