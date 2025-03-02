/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Safari Bookmarks Parser Example
 *
 * This example demonstrates how to call the pre-compiled Safari bookmarks parser written in Go from Node.js
 * Designed specifically for macOS and Raycast
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Parse Safari bookmarks
 * @param {string} [inputPath] - Safari bookmarks file path, defaults to user's Safari bookmarks file
 * @returns {Object} Parsed bookmarks object
 */
function parseSafariBookmarks(inputPath) {
  try {
    // Path to the pre-compiled executable
    const executablePath = path.join(__dirname, "tools", "bookmarks-parser");

    // Ensure the executable exists
    if (!fs.existsSync(executablePath)) {
      throw new Error(
        `Executable not found at ${executablePath}. Please compile the Go program first by running 'npm run build' in the src/go directory.`,
      );
    }

    // Build command
    let cmd = `"${executablePath}"`;

    // Add parameters
    if (inputPath) {
      cmd += ` -input "${inputPath}"`;
    }
    // Don't specify output file to get stdout output

    // Execute the pre-compiled Go program and capture stdout
    console.log(`Executing command: ${cmd}`);
    const result = execSync(cmd, { encoding: "utf8" });

    // Parse the JSON output directly from stdout
    return JSON.parse(result);
  } catch (error) {
    console.error("Error parsing Safari bookmarks:", error.message);
    // Provide more detailed guidance
    if (error.message.includes("operation not permitted")) {
      console.error("Permission denied. Please check:");
      console.error("1. Ensure you have read access to the Bookmarks.plist file");
      console.error("2. Check System Preferences > Security & Privacy > Privacy > Full Disk Access");
      console.error("3. Add your terminal or IDE to Full Disk Access if needed");
    }

    throw error;
  }
}

// Example usage
try {
  const plistFile = path.join(require("os").homedir(), "Library/Safari/Bookmarks.plist");
  // Parse bookmarks
  const goStart = performance.now();
  const result = parseSafariBookmarks(plistFile);
  console.log('=== GO PARSER PERF ===')
  console.log('go parser cost', performance.now() - goStart);
  console.log('=== GO PARSER RESULT ===')
  console.log(JSON.stringify(result, null, 2));

  const plistStart = performance.now();
  require("simple-plist").readFileSync(plistFile);
  console.log('=== SIMPLE PLIST PERF ===')
  console.log('plist cost', performance.now() - plistStart);
  console.log('=== SIMPLE PLIST RESULT ===')
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Program execution failed:", error);
}
