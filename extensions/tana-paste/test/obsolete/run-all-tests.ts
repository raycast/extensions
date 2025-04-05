// Comprehensive test script to run all tests in an easy-to-read format

import fs from 'fs';
import path from 'path';
import { convertToTana } from '../src/utils/tana-converter.ts';

// Define colors for terminal output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';

// Define all test cases
const testCases = [
  { name: 'Standard Markdown Formatting', inputFile: './test/test-standard-markdown.md' },
  { name: 'Brackets', inputFile: './test/test-brackets.md' },
  { name: 'Bullet Points', inputFile: './test/test-bullet-points.md' },
  { name: 'Colons', inputFile: './test/test-colons.md' },
  { name: 'Headings', inputFile: './test/test-headings.md' },
  { name: 'Mixed Colons', inputFile: './test/test-mixed-colons.md' },
  { name: 'Real Fields', inputFile: './test/test-real-fields.md' },
  { name: 'Real Tags', inputFile: './test/test-real-tags.md' },
  { name: 'Tags', inputFile: './test/test-tags.md' },
  { name: 'Final', inputFile: './test/test-final.md' },
  { name: 'YouTube Timestamps', inputFile: './test/test-youtube-timestamps.md' },
  { name: 'Combined Features', inputFile: './test/test-combined-features.md' }
];

// Function to run a single test
function runTest(testCase: { name: string; inputFile: string }) {
  console.log(`\n${BLUE}${BOLD}===== Testing: ${testCase.name} =====${RESET}`);
  
  try {
    // Read test file
    const testFile = fs.readFileSync(testCase.inputFile, 'utf-8');
    
    // Convert
    const result = convertToTana(testFile);
    
    // Basic validation
    if (!result.startsWith("%%tana%%")) {
      throw new Error("Output does not start with %%tana%%");
    }
    
    // Special checks for specific tests
    if (testCase.name === 'Standard Markdown Formatting') {
      // Test for bold text preservation
      if (result.includes("*__Definition:__*")) {
        throw new Error("Bold text was incorrectly converted to italic-underscore format");
      }
      
      if (!result.includes("**Definition:**")) {
        throw new Error("Bold text was not preserved correctly");
      }
      
      // Validate indentation
      const lines = result.split('\n');
      const frameworkLine = lines.findIndex(line => line.includes('The Context Intelligence Framework'));
      const awarenessLine = lines.findIndex(line => line.includes('1. Context Awareness'));
      const definitionLine = lines.findIndex(line => line.includes('**Definition:**'));
      
      if (awarenessLine <= frameworkLine || definitionLine <= awarenessLine) {
        throw new Error("Hierarchy ordering is incorrect");
      }
      
      const frameworkIndent = lines[frameworkLine].indexOf('-');
      const awarenessIndent = lines[awarenessLine].indexOf('-');
      const definitionIndent = lines[definitionLine].indexOf('-');
      
      if (awarenessIndent <= frameworkIndent || definitionIndent <= awarenessIndent) {
        throw new Error("Indentation hierarchy is incorrect");
      }
    }
    
    // Show a sample of the conversion
    console.log(`${YELLOW}Input (sample):${RESET}`);
    console.log(testFile.substring(0, 100).split('\n').slice(0, 3).join('\n'));
    console.log(`${YELLOW}Output (sample):${RESET}`);
    console.log(result.substring(0, 100).split('\n').slice(0, 3).join('\n'));
    
    console.log(`${GREEN}✓ PASSED${RESET}`);
    return { success: true };
  } catch (error) {
    console.error(`${RED}✗ FAILED: ${error.message}${RESET}`);
    return { success: false, error };
  }
}

// Run all tests
console.log(`${BOLD}${BLUE}======================================${RESET}`);
console.log(`${BOLD}${BLUE}      Running All Format Tests       ${RESET}`);
console.log(`${BOLD}${BLUE}======================================${RESET}`);

const results = testCases.map(testCase => ({
  name: testCase.name,
  result: runTest(testCase)
}));

// Print summary
console.log(`\n${BOLD}${BLUE}======================================${RESET}`);
console.log(`${BOLD}${BLUE}           Test Summary              ${RESET}`);
console.log(`${BOLD}${BLUE}======================================${RESET}`);

const passedTests = results.filter(r => r.result.success).length;
const failedTests = results.length - passedTests;

console.log(`${GREEN}✓ Passed: ${passedTests}/${results.length}${RESET}`);
if (failedTests > 0) {
  console.log(`${RED}✗ Failed: ${failedTests}/${results.length}${RESET}`);
  console.log(`\n${YELLOW}Failed tests:${RESET}`);
  results
    .filter(r => !r.result.success)
    .forEach(r => console.log(`${RED}✗ ${r.name}${RESET}`));
}

console.log(`${BOLD}${BLUE}======================================${RESET}`); 