#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';

interface ShoeboxApp {
  id: string;
  type: string;
  attributes: {
    name: string;
    artistName: string;
    [key: string]: any;
  };
}

interface ShoeboxData {
  [key: string]: {
    x: number;
    d: ShoeboxApp[];
  };
}

/**
 * Extracts the shoebox-media-api-cache-apps script content from HTML
 */
function extractShoeboxData(html: string): string | null {
  // Look for the script tag with the specific id
  const scriptRegex = /<script[^>]*id="shoebox-media-api-cache-apps"[^>]*>(.*?)<\/script>/s;
  const match = html.match(scriptRegex);
  
  if (!match) {
    return null;
  }
  
  return match[1].trim();
}

/**
 * Processes an HTML file and saves the shoebox data as a fixture
 */
function processHtmlFile(inputPath: string, outputPath: string): void {
  console.log(`Processing ${inputPath}...`);
  
  try {
    const html = readFileSync(inputPath, 'utf-8');
    const shoeboxContent = extractShoeboxData(html);
    
    if (!shoeboxContent) {
      console.log(`  ❌ No shoebox-media-api-cache-apps script found in ${inputPath}`);
      return;
    }
    
    // Try to parse the JSON to validate it
    let parsedData: ShoeboxData;
    try {
      parsedData = JSON.parse(shoeboxContent);
    } catch (error) {
      console.log(`  ❌ Invalid JSON in shoebox data: ${error}`);
      return;
    }
    
    // Get app info for logging
    const firstKey = Object.keys(parsedData)[0];
    const apps = parsedData[firstKey]?.d || [];
    const appNames = apps.map(app => `${app.attributes?.name} (${app.attributes?.artistName})`).join(', ');
    
    // Save the raw JSON content to fixture file
    writeFileSync(outputPath, shoeboxContent, 'utf-8');
    
    console.log(`  ✅ Saved shoebox data to ${outputPath}`);
    console.log(`  📱 Found ${apps.length} app(s): ${appNames}`);
    
  } catch (error) {
    console.log(`  ❌ Error processing ${inputPath}: ${error}`);
  }
}

/**
 * Main function to process all HTML files
 */
function main(): void {
  const htmlFiles = [
    { input: '/tmp/instagram_full.html', output: 'tests/fixtures/shoebox_instagram.json' },
    { input: '/tmp/netflix_full.html', output: 'tests/fixtures/shoebox_netflix.json' },
    { input: '/tmp/spotify_full.html', output: 'tests/fixtures/shoebox_spotify.json' },
    { input: '/tmp/word_full.html', output: 'tests/fixtures/shoebox_word.json' },
    { input: '/tmp/youtubetv_full.html', output: 'tests/fixtures/shoebox_youtubetv.json' },
  ];
  
  console.log('🔍 Extracting shoebox data from App Store HTML pages...\n');
  
  htmlFiles.forEach(({ input, output }) => {
    processHtmlFile(input, output);
  });
  
  console.log('\n✨ Done! Check the tests/fixtures/ directory for the extracted shoebox data.');
}

if (require.main === module) {
  main();
}

export { extractShoeboxData, processHtmlFile };
