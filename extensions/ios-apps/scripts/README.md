# iOS Apps Extension Scripts

This directory contains utility scripts for the iOS Apps Raycast extension. These scripts help with development, testing, and data analysis tasks.

## Table of Contents

- [check-platforms.js](#check-platformsjs)
- [debug-platform-extraction.ts](#debug-platform-extractionts)
- [extract-shoebox-fixtures.ts](#extract-shoebox-fixturests)

## check-platforms.js

A utility script that scans JSON fixture files for device types in the `customScreenshotsByType` field and reports on the distribution of platforms across fixtures.

### Using the Check Platforms Script

#### 1. Run directly from the command line

```bash
node scripts/check-platforms.js
```

This will scan your fixture files and display a summary of all device types found, including screenshot counts.

#### 2. Import in another script

```javascript
import platformAnalyzer from './scripts/check-platforms.js';

// Analyze with custom options
const results = platformAnalyzer.analyzePlatformDistribution({
  fixturesDir: './path/to/your/fixtures',
  verbose: false // Suppress console output
});

// Access the results
console.log(`Found ${results.allDeviceTypes.length} device types`);
console.log(results.totalScreenshotCounts);
```

#### 3. Use individual functions

```javascript
import platformAnalyzer from './scripts/check-platforms.js';

// Find fixture files
const files = platformAnalyzer.findFixtureFiles('./path/to/fixtures');

// Analyze a specific fixture
const { platforms, screenshotCounts } = platformAnalyzer.extractPlatformsFromFixture(
  './path/to/fixture.json',
  false // Set verbose to false
);

console.log(`This fixture has ${platforms.size} device types`);
```

#### 4. Add to package.json scripts

Add this to your package.json:

```json
"scripts": {
  "check-platforms": "node scripts/check-platforms.js"
}
```

Then run:

```bash
npm run check-platforms
```

## debug-platform-extraction.ts

A debug script to test platform extraction from shoebox fixtures. It helps identify what platforms are being extracted versus what's available.

### Using the Debug Platform Extraction Script

#### Run directly

```bash
npx tsx scripts/debug-platform-extraction.ts
```

This script:

1. Loads the first 3 shoebox fixture files from the tests/fixtures directory
2. Processes each file using the actual app-store-scraper utility functions
3. Shows a breakdown of platforms found in each fixture
4. Tests different platform filtering configurations

#### Customize

You can modify the script to:

- Change which fixtures are tested by editing the `shoeboxFiles` filter
- Adjust the mock preferences to test different platform combinations
- Add more test configurations in the `testConfigs` array

## extract-shoebox-fixtures.ts

A utility script to extract shoebox data from App Store HTML pages and save it as fixture files for testing.

### Using the Extract Shoebox Fixtures Script

#### 1. Run directly

```bash
npx tsx scripts/extract-shoebox-fixtures.ts
```

This will process the predefined HTML files and extract the shoebox data into JSON fixtures.

#### 2. Customize HTML sources

Edit the `htmlFiles` array in the `main()` function to process different HTML files:

```typescript
const htmlFiles = [
  { input: '/path/to/your/html/file.html', output: 'tests/fixtures/shoebox_yourapp.json' },
  // Add more files as needed
];
```

#### 3. Use programmatically

```typescript
import { processHtmlFile } from './scripts/extract-shoebox-fixtures';

// Extract shoebox data from a single HTML file
processHtmlFile('/path/to/input.html', 'path/to/output.json');
```

Note: The script expects HTML files that contain App Store data with a `<script type="fastboot/shoebox" id="shoebox-media-api-cache-apps">` element.

## Common Workflows

### Adding New Test Fixtures

1. Save the HTML from an App Store page to a temporary location
2. Add the file path to `extract-shoebox-fixtures.ts`
3. Run the extraction script
4. Verify the extracted data with `debug-platform-extraction.ts`
5. Analyze platform coverage with `check-platforms.js`

### Debugging Platform Issues

If you encounter issues with platform detection or filtering:

1. Run `debug-platform-extraction.ts` to see what platforms are being extracted
2. Check the platform counts with `check-platforms.js`
3. Compare the results to identify discrepancies
