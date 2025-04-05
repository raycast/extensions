// Test script for combined features including YouTube transcript timestamps

import fs from 'fs';
import { convertToTana } from '../src/utils/tana-converter.ts';

// Read test file
const testFile = fs.readFileSync('./test-combined-features.md', 'utf-8');

// Convert and log result
const result = convertToTana(testFile);
console.log("INPUT:");
console.log("-------");
console.log(testFile);
console.log("\nOUTPUT:");
console.log("-------");
console.log(result); 