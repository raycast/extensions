// Jest test setup
// This file can be used to setup any test utilities or global mocks

// Import any modules you need for testing
import fs from 'fs';
import path from 'path';

// Define test data paths (if needed)
export const TEST_DATA_PATH = path.join(__dirname, 'data');

// Read test file helper function
export function readTestFile(filename: string): string {
  return fs.readFileSync(path.join(TEST_DATA_PATH, filename), 'utf-8');
}

// Any other test utilities can go here 