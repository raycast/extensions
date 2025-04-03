// Test script for tana-converter.ts

import { readFileSync } from 'fs';
import { convertToTana } from '../src/utils/tana-converter.js';

// Read test file
const testFile = readFileSync('./test/test-brackets.md', 'utf-8');

// Convert and log result
const result = convertToTana(testFile);
console.log("INPUT:");
console.log("-------");
console.log(testFile);
console.log("\nOUTPUT:");
console.log("-------");
console.log(result); 