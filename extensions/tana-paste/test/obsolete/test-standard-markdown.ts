// Test for ensuring standard markdown format is correctly processed

import fs from 'fs';
import path from 'path';
import { convertToTana } from '../src/utils/tana-converter.ts';

function runStandardMarkdownFormattingTest() {
  console.log(`\n======================================`);
  console.log(`Testing: Standard Markdown Formatting`);
  console.log(`======================================`);
  
  try {
    // Read test file
    const testFile = fs.readFileSync('./test/test-standard-markdown.md', 'utf-8');
    
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
    
    console.log("\nTest PASSED! ✅");
    return true;
  } catch (error) {
    console.error(`\nTest FAILED! ❌`);
    console.error(error);
    return false;
  }
}

// Run the test
runStandardMarkdownFormattingTest(); 