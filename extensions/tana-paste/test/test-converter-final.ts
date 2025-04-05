// Test script for tana-converter.ts - final test for colon handling

import fs from 'fs';
import { convertToTana } from '../src/utils/tana-converter';

// Read test file
const testFile = fs.readFileSync('./test/test-final.md', 'utf-8');

// Convert and log result
const result = convertToTana(testFile);
console.log("INPUT:");
console.log("-------");
console.log(testFile);
console.log("\nOUTPUT:");
console.log("-------");
console.log(result); 