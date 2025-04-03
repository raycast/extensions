// Test script for YouTube transcript timestamp handling in tana-converter.ts

import fs from 'fs';
import { convertToTana } from '../src/utils/tana-converter.ts';

// Read test file with YouTube transcript
const testFile = fs.readFileSync('./test-youtube-timestamps.md', 'utf-8');

// Convert and log result
const result = convertToTana(testFile);
console.log("INPUT:");
console.log("-------");
console.log(testFile);
console.log("\nOUTPUT:");
console.log("-------");
console.log(result); 