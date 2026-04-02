import * as cheerio from 'cheerio';
import fs from 'fs';

const API_URL = 'https://tibia.fandom.com/api.php';
const CATEGORY = 'Category:Items_Bought_by_NPCs';

// Map to store all items and their NPC prices
const itemsMap = new Map();

// Statistics
let totalProcessed = 0;
let withPrices = 0;
let errors = 0;

/**
 * Fetch all item names from the category (with pagination)
 */
async function fetchCategoryMembers() {
  const items = [];
  let cmcontinue = null;

  console.log(`Fetching all items from ${CATEGORY}...`);

  do {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: CATEGORY,
      cmlimit: '500',
      format: 'json'
    });

    if (cmcontinue) {
      params.append('cmcontinue', cmcontinue);
    }

    const url = `${API_URL}?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    const members = data.query?.categorymembers || [];
    items.push(...members);

    cmcontinue = data.continue?.cmcontinue;
    console.log(`  Fetched ${items.length} items so far...`);

    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (cmcontinue);

  console.log(`✓ Total items in category: ${items.length}\n`);
  return items;
}

/**
 * Fetch and parse a single item page for NPC buy prices
 */
async function fetchItemData(itemTitle) {
  try {
    const url = `${API_URL}?action=parse&page=${encodeURIComponent(itemTitle)}&format=json&prop=text`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`  ✗ Error fetching ${itemTitle}: ${data.error.info}`);
      return null;
    }

    const html = data.parse?.text?.['*'];
    if (!html) return null;

    const $ = cheerio.load(html);

    // Look for the "Sell To" section
    const sellToSection = $('#npc-trade-sellto');
    if (sellToSection.length === 0) {
      return null;
    }

    // Find the table within the Sell To section
    const table = sellToSection.find('table.wikitable');
    if (table.length === 0) {
      return null;
    }

    const buyers = [];

    // Parse the table rows
    table.find('tr').slice(1).each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 3) {
        // Extract NPC name
        const npcCell = cells.eq(0);
        const npcLink = npcCell.find('a').first();
        const npcName = npcLink.attr('title') || npcCell.text().trim();

        // Extract location
        const locationCell = cells.eq(1);
        const locationLink = locationCell.find('a').first();
        const location = locationLink.attr('title') || locationCell.text().trim();

        // Extract price
        const priceCell = cells.eq(2);
        const priceText = priceCell.text().trim();
        const priceMatch = priceText.match(/(\d+(?:,\d+)*)/);

        if (npcName && priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          buyers.push({
            name: npcName,
            location: location || 'Unknown',
            price: price
          });
        }
      }
    });

    // Check for stackable in infobox
    const infobox = $('.infobox, .infoboxtable');
    let stackable = false;
    infobox.find('tr').each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').text().trim().toLowerCase();
      if (header.includes('stackable')) {
        const value = $row.find('td').text().trim().toLowerCase();
        stackable = value.includes('yes') || value === '✓';
      }
    });

    return {
      name: itemTitle,
      buyers: buyers.sort((a, b) => b.price - a.price),
      ...(stackable && { stackable: true })
    };
  } catch (error) {
    console.error(`  ✗ Error processing ${itemTitle}:`, error.message);
    errors++;
    return null;
  }
}

/**
 * Scrape all items with rate limiting
 */
async function scrapeAllItems() {
  console.log('Starting enhanced Tibia Wiki scraper...\n');

  // Get all item names from category
  const categoryMembers = await fetchCategoryMembers();

  console.log('Starting to fetch individual item pages...');
  console.log('This will take a while - processing with delays to be respectful to the server.\n');

  const batchSize = 50;
  let processed = 0;

  for (let i = 0; i < categoryMembers.length; i++) {
    const item = categoryMembers[i];
    const itemTitle = item.title;

    const itemData = await fetchItemData(itemTitle);
    totalProcessed++;

    if (itemData && itemData.buyers.length > 0) {
      itemsMap.set(itemTitle, itemData);
      withPrices++;
      console.log(`  ✓ [${totalProcessed}/${categoryMembers.length}] ${itemTitle} - ${itemData.buyers.length} buyer(s), max price: ${itemData.buyers[0].price} gp`);
    } else {
      console.log(`  ○ [${totalProcessed}/${categoryMembers.length}] ${itemTitle} - no price data`);
    }

    processed++;

    // Progress update every batch
    if (processed % batchSize === 0) {
      console.log(`\n--- Progress: ${processed}/${categoryMembers.length} items processed (${withPrices} with prices) ---\n`);
    }

    // Rate limiting: delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Convert map to array
  const items = Array.from(itemsMap.values());

  console.log(`\n\n=== SCRAPING COMPLETE ===`);
  console.log(`Total items processed: ${totalProcessed}`);
  console.log(`Items with NPC prices: ${withPrices}`);
  console.log(`Items without prices: ${totalProcessed - withPrices}`);
  console.log(`Errors: ${errors}`);

  // Save to JSON file
  const output = {
    scrapedAt: new Date().toISOString(),
    totalItems: items.length,
    items: items
  };

  fs.writeFileSync('scraped-data-category.json', JSON.stringify(output, null, 2));
  console.log('\nData saved to scraped-data-category.json');

  // Generate TypeScript data file
  generateTypeScriptFile(items);
}

/**
 * Generate TypeScript data file
 */
function generateTypeScriptFile(items) {
  const tsContent = `// Auto-generated from Tibia Wiki scraper (Category: Items Bought by NPCs)
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
scrapeAllItems().catch(console.error);
