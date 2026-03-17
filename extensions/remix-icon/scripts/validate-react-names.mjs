#!/usr/bin/env node

/**
 * Validation script for React component name generation.
 * 
 * Purpose:
 *   - Validates that all icon names generate valid React component names
 *   - Checks for duplicate component names (e.g., two icons generating "RiArrowFill")
 *   - Compares generated names with the official @remixicon/react package
 *   - Ensures 100% compatibility with the official React package
 * 
 * Usage:
 *   node scripts/validate-react-names.mjs
 * 
 * Exit codes:
 *   - 0: All validations passed
 *   - 1: Found invalid names, duplicates, or mismatches with official package
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toReactComponentName } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compressedDir = path.join(__dirname, "../assets/icons-compressed");

// Load all icons from compressed JSON files (one file per category)
const icons = fs.readdirSync(compressedDir)
  .filter(f => f.endsWith(".json"))
  .flatMap(file => {
    const data = JSON.parse(fs.readFileSync(path.join(compressedDir, file), "utf-8"));
    return Object.keys(data).map(name => ({ name, category: path.basename(file, ".json") }));
  });

console.log(`Validating ${icons.length} icon names...\n`);

// Validate component names against React naming rules
// Pattern: /^Ri[A-Z0-9][a-zA-Z0-9]*$/
//   - Must start with "Ri" prefix
//   - Next character must be uppercase letter or digit (allows Ri24HoursFill)
//   - Remaining characters can be letters or digits
const generatedNames = new Set();
const issues = icons.filter(({ name }) => {
  const componentName = toReactComponentName(name);
  const isDuplicate = generatedNames.has(componentName);
  const isInvalid = !/^Ri[A-Z0-9][a-zA-Z0-9]*$/.test(componentName);
  generatedNames.add(componentName);
  return isDuplicate || isInvalid;
});

// Report any invalid or duplicate component names
if (issues.length > 0) {
  console.error("❌ Invalid component names:");
  console.table(issues.map(({ name, category }) => ({ 
    icon: name, 
    category, 
    generated: toReactComponentName(name) 
  })));
  process.exit(1);
}

// Compare with the official @remixicon/react package to ensure compatibility
try {
  // Dynamically import the official package and extract component names
  const RemixIcons = await import("@remixicon/react");
  const actualNames = new Set(Object.keys(RemixIcons).filter(k => k !== "default"));
  
  // Check for mismatches between our generated names and the official package
  const missing = [...generatedNames].filter(n => !actualNames.has(n)); // We generate but package doesn't have
  const extra = [...actualNames].filter(n => !generatedNames.has(n)); // Package has but we don't generate
  
  if (missing.length > 0 || extra.length > 0) {
    console.log(`\n⚠️  Mismatch with @remixicon/react:`);
    if (missing.length) console.log(`   Missing: ${missing.length}`);
    if (extra.length) console.log(`   Extra: ${extra.length}`);
    process.exit(1);
  }
  
  console.log(`✅ Perfect match with @remixicon/react (${actualNames.size} components)`);
} catch {
  // Package comparison is optional - script still validates pattern rules
  console.log("⚠️  @remixicon/react not installed (npm install -D @remixicon/react)");
}

// All validations passed!
console.log(`✅ All ${icons.length} icons validated`);
console.log(`\nExamples: ${icons.slice(0, 3).map(i => toReactComponentName(i.name)).join(", ")}`);

