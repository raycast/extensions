#!/usr/bin/env node
/**
 * Script to check platform distribution in shoebox fixtures
 * 
 * This script scans JSON fixture files for device types in the customScreenshotsByType
 * field and reports on the distribution of platforms across fixtures.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to recursively find device types in JSON objects
 * @param {Object} obj - Object to search
 * @param {string} objPath - Current path in the object
 * @param {Set<string>} platforms - Set to collect platform types
 * @param {Object} screenshotCounts - Object to track screenshot counts
 * @param {boolean} verbose - Whether to log detailed information
 */
function findDeviceTypes(obj, objPath = "", platforms, screenshotCounts, verbose) {
  if (!obj || typeof obj !== "object") return;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findDeviceTypes(item, objPath ? `${objPath}[${index}]` : `[${index}]`, platforms, screenshotCounts, verbose);
    });
    return;
  }
  
  // Handle objects
  for (const [key, value] of Object.entries(obj)) {
    if (key === "customScreenshotsByType" && value && typeof value === "object") {
      if (verbose) console.log(`  Found customScreenshotsByType at path: ${objPath}.${key}`);
      
      for (const deviceType of Object.keys(value)) {
        platforms.add(deviceType);
        const count = Array.isArray(value[deviceType]) ? value[deviceType].length : 0;
        screenshotCounts[deviceType] = (screenshotCounts[deviceType] || 0) + count;
        
        if (verbose) {
          console.log(`    Device type: ${deviceType} (${count} screenshots)`);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      findDeviceTypes(value, objPath ? `${objPath}.${key}` : key, platforms, screenshotCounts, verbose);
    } else if (typeof value === "string" && value.startsWith("{")) {
      // Try to parse nested JSON strings
      try {
        const nestedObj = JSON.parse(value);
        findDeviceTypes(nestedObj, objPath ? `${objPath}.${key}[parsed]` : `${key}[parsed]`, platforms, screenshotCounts, verbose);
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }
}

/**
 * Extract platform types from a fixture file
 * @param {string} filePath - Path to the JSON fixture file
 * @param {boolean} verbose - Whether to log detailed information
 * @returns {Set<string>} Set of platform types found
 */
function extractPlatformsFromFixture(filePath, verbose = true) {
  try {
    const jsonContent = JSON.parse(readFileSync(filePath, "utf8"));
    const platforms = new Set();
    const screenshotCounts = {};
    
    // Use the helper function to find device types
    findDeviceTypes(jsonContent, "", platforms, screenshotCounts, verbose);
    return { platforms, screenshotCounts };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { platforms: new Set(), screenshotCounts: {} };
  }
}

/**
 * Find all fixture files in a directory
 * @param {string} directory - Directory to search
 * @param {string} pattern - File pattern to match
 * @returns {string[]} Array of matching file paths
 */
function findFixtureFiles(directory, pattern = /^shoebox_.+\.json$/) {
  try {
    if (!existsSync(directory)) {
      console.warn(`⚠️ Directory does not exist: ${directory}`);
      return [];
    }
    
    return readdirSync(directory)
      .filter(file => pattern.test(file))
      .map(file => join(directory, file));
  } catch (error) {
    console.error(`Error finding fixture files:`, error.message);
    return [];
  }
}

/**
 * Main function to analyze platform distribution
 * @param {Object} options - Configuration options
 * @returns {Object} Analysis results
 */
function analyzePlatformDistribution(options = {}) {
  const {
    fixturesDir = join(__dirname, "../tests/fixtures"),
    altFixturesDirs = [
      join(__dirname, "../__tests__/fixtures"),
      join(__dirname, "../src/__tests__/fixtures")
    ],
    verbose = true
  } = options;
  
  // Try to find fixtures in the primary directory or alternatives
  let allFixtureDirs = [fixturesDir, ...altFixturesDirs];
  let fixturePaths = [];
  
  for (const dir of allFixtureDirs) {
    const files = findFixtureFiles(dir);
    if (files.length > 0) {
      fixturePaths = files;
      if (verbose) console.log(`Found ${files.length} fixture files in ${dir}`);
      break;
    }
  }
  
  if (fixturePaths.length === 0) {
    console.error("❌ No fixture files found in any of the searched directories");
    return { allDeviceTypes: new Set(), fixtureResults: {} };
  }

  if (verbose) console.log("🔍 Checking platform distribution in shoebox fixtures...\n");

  const allDeviceTypes = new Set();
  const fixtureResults = {};
  const totalScreenshotCounts = {};
  
  for (const filePath of fixturePaths) {
    const fileName = basename(filePath);
    const appName = fileName.replace(/^shoebox_/, "").replace(/\.json$/, "");
    
    if (verbose) console.log(`📱 ${appName} (${fileName}):`);
    const { platforms, screenshotCounts } = extractPlatformsFromFixture(filePath, verbose);
    
    fixtureResults[appName] = {
      platforms: Array.from(platforms),
      screenshotCounts
    };
    
    if (platforms.size === 0) {
      if (verbose) console.log("  ❌ No device types found");
    } else {
      if (verbose) console.log(`  ✅ Found ${platforms.size} device types: ${Array.from(platforms).join(", ")}`);
      platforms.forEach(p => {
        allDeviceTypes.add(p);
        totalScreenshotCounts[p] = (totalScreenshotCounts[p] || 0) + (screenshotCounts[p] || 0);
      });
    }
    if (verbose) console.log();
  }
  
  if (verbose) {
    console.log(`📊 Summary - All unique device types found across fixtures:`);
    console.log(`   ${Array.from(allDeviceTypes).sort().join(", ")}`);
    console.log(`   Total: ${allDeviceTypes.size} unique device types`);
    console.log();
    console.log(`📸 Screenshot counts by device type:`);
    Object.entries(totalScreenshotCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([deviceType, count]) => {
        console.log(`   ${deviceType}: ${count} screenshots`);
      });
  }
  
  return { 
    allDeviceTypes: Array.from(allDeviceTypes), 
    fixtureResults,
    totalScreenshotCounts
  };
}

// Run if called directly
// In ES modules, we check if this is the main module using import.meta.url
const isMainModule = import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  analyzePlatformDistribution();
}

// Export functions for programmatic use
export default {
  extractPlatformsFromFixture,
  findFixtureFiles,
  analyzePlatformDistribution
};
