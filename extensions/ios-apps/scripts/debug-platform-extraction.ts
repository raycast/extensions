#!/usr/bin/env tsx
/**
 * Debug script to test platform extraction from shoebox fixtures
 * This helps identify what platforms are being extracted vs what's available
 */

import fs from "fs";
import path from "path";
import { extractScreenshotsFromShoeboxJson, filterScreenshotsByPlatforms } from "../src/utils/app-store-scraper";
import type { PlatformType } from "../src/types";

// Mock logger for this script
const logger = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

// Make logger available globally
(global as any).logger = logger;

// Mock getPreferenceValues function
const mockPreferences = {
  includeIPhone: true,
  includeIPad: true,
  includeMac: true,  // Enable all platforms for testing
  includeAppleTV: true,
  includeAppleWatch: true,
  includeVisionPro: true,
};

// Mock Raycast API
(global as any).getPreferenceValues = () => mockPreferences;
(global as any).showToast = () => Promise.resolve({});

async function testPlatformExtraction() {
  const fixturesDir = path.join(__dirname, "../tests/fixtures");
  const shoeboxFiles = fs.readdirSync(fixturesDir)
    .filter(file => file.startsWith("shoebox_") && file.endsWith(".json"))
    .slice(0, 3); // Test first 3 files

  console.log("🔍 Testing platform extraction from shoebox fixtures...\n");

  for (const file of shoeboxFiles) {
    const filePath = path.join(fixturesDir, file);
    const appName = file.replace("shoebox_", "").replace(".json", "");
    
    console.log(`📱 Testing ${appName}:`);
    console.log(`   File: ${file}`);
    
    try {
      // Read the JSON fixture directly
      const jsonContent = fs.readFileSync(filePath, "utf8");
      
      // Wrap it in a mock HTML structure like the real shoebox extractor expects
      const mockHtml = `
        <script type="fastboot/shoebox" id="shoebox-media-api-cache-apps">
        ${jsonContent}
        </script>
      `;
      
      // Extract screenshots using the real function
      const allScreenshots = (extractScreenshotsFromShoeboxJson as any)(mockHtml);
      
      console.log(`   📊 Total screenshots extracted: ${allScreenshots.length}`);
      
      // Group by platform
      const platformCounts: Record<string, number> = {};
      allScreenshots.forEach((screenshot: any) => {
        platformCounts[screenshot.type] = (platformCounts[screenshot.type] || 0) + 1;
      });
      
      // Show platform breakdown
      console.log(`   🏷️  Platforms found:`);
      for (const [platform, count] of Object.entries(platformCounts)) {
        console.log(`      ${platform}: ${count} screenshots`);
      }
      
      // Test filtering with different platform combinations
      const testConfigs = [
        { name: "iPhone + iPad only", platforms: ["iPhone", "iPad"] as PlatformType[] },
        { name: "All platforms", platforms: ["iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro"] as PlatformType[] },
        { name: "Apple TV only", platforms: ["AppleTV"] as PlatformType[] },
      ];
      
      for (const config of testConfigs) {
        const filtered = (filterScreenshotsByPlatforms as any)(allScreenshots, config.platforms);
        console.log(`   ⚙️  ${config.name}: ${filtered.length} screenshots`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error);
    }
    
    console.log(); // Empty line for readability
  }
}

// Check if running directly
if (require.main === module) {
  testPlatformExtraction().catch(console.error);
}
