import * as fs from "fs";
import * as path from "path";
import { extractScreenshotsFromShoeboxJson } from "../src/utils/app-store-scraper";

/**
 * Helper function to handle circular references in JSON.stringify
 * Prevents errors when serializing objects with circular references
 */
export function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Helper function to create HTML with shoebox JSON
 * Creates a mock App Store page with embedded shoebox data for testing
 */
export function createShoeboxHtml(shoeboxJson: Record<string, unknown>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>App Store</title>
    </head>
    <body>
      <script type="fastboot/shoebox" id="shoebox-media-api-cache-apps">
        ${JSON.stringify(shoeboxJson, getCircularReplacer())}
      </script>
    </body>
    </html>
  `;
}

/**
 * Get the path to a fixture file in the tests/fixtures directory
 */
export function getFixturePath(filename: string): string {
  return path.join(__dirname, "../tests/fixtures", filename);
}

/**
 * Load and parse a JSON fixture file
 */
export function loadFixture(filename: string): Record<string, unknown> {
  const fixturePath = getFixturePath(filename);
  const fixtureData = fs.readFileSync(fixturePath, "utf8");
  return JSON.parse(fixtureData) as Record<string, unknown>;
}

/**
 * Load a fixture, create HTML, and extract screenshots in one step
 * Useful for tests that need to process fixture data into screenshots
 */
export function extractScreenshotsFromFixture(filename: string) {
  const fixture = loadFixture(filename);
  const html = createShoeboxHtml(fixture);
  return extractScreenshotsFromShoeboxJson(html);
}
