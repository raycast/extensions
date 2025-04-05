// Comprehensive test script to verify all functionality
// This runs all test cases to ensure no regressions

import fs from 'fs';
import path from 'path';
import { convertToTana } from '../src/utils/tana-converter.ts';

// Define all test cases
const testCases = [
  { name: 'Brackets', inputFile: 'test-brackets.md' },
  { name: 'Bullet Points', inputFile: 'test-bullet-points.md' },
  { name: 'Colons', inputFile: 'test-colons.md' },
  { name: 'Headings', inputFile: 'test-headings.md' },
  { name: 'Mixed Colons', inputFile: 'test-mixed-colons.md' },
  { name: 'Real Fields', inputFile: 'test-real-fields.md' },
  { name: 'Real Tags', inputFile: 'test-real-tags.md' },
  { name: 'Tags', inputFile: 'test-tags.md' },
  { name: 'Final', inputFile: 'test-final.md' },
  { name: 'YouTube Timestamps', inputFile: 'test-youtube-timestamps.md' },
  { name: 'Combined Features', inputFile: 'test-combined-features.md' }
];

// Function to run a single test
function runTest(testCase: { name: string; inputFile: string }) {
  console.log(`\n======================================`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`======================================`);
  
  try {
    // Read test file
    const testFile = fs.readFileSync(path.join('./', testCase.inputFile), 'utf-8');
    
    // Convert and log result
    const result = convertToTana(testFile);
    
    console.log("INPUT:");
    console.log("-------");
    console.log(testFile.substring(0, 200) + (testFile.length > 200 ? "..." : ""));
    
    console.log("\nOUTPUT:");
    console.log("-------");
    console.log(result.substring(0, 200) + (result.length > 200 ? "..." : ""));
    
    // Basic validation
    if (!result.startsWith("%%tana%%")) {
      throw new Error("Output does not start with %%tana%%");
    }
    
    console.log("\nTest PASSED! ✅");
    return true;
  } catch (error) {
    console.error(`\nTest FAILED! ❌`);
    console.error(error);
    return false;
  }
}

// Run all tests
console.log("Starting comprehensive test suite...");
console.log("==================================");

let passedTests = 0;
let failedTests = 0;

// Run each test and track results
testCases.forEach(testCase => {
  const success = runTest(testCase);
  if (success) {
    passedTests++;
  } else {
    failedTests++;
  }
});

// Print summary
console.log("\n==================================");
console.log("Test Summary:");
console.log(`✅ Passed: ${passedTests}/${testCases.length}`);
console.log(`❌ Failed: ${failedTests}/${testCases.length}`);
console.log("=================================="); 