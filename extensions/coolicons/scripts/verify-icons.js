#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the actual SVG files from the repository
const svgBasePath = path.join(__dirname, '../../coolicons SVG');
const categories = fs.readdirSync(svgBasePath).filter(item => {
  return fs.statSync(path.join(svgBasePath, item)).isDirectory();
});

// Build actual icon map from file system
const actualIcons = {};
categories.forEach(category => {
  const categoryPath = path.join(svgBasePath, category);
  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.svg'));
  files.forEach(file => {
    const iconName = file.replace('.svg', '');
    actualIcons[iconName] = category;
  });
});

// Read our helpers.ts file to extract the mapping
const helpersPath = path.join(__dirname, '../src/utils/helpers.ts');
const helpersContent = fs.readFileSync(helpersPath, 'utf-8');

// Extract icon mappings from helpers.ts
const mappedIcons = {};
const iconMapRegex = /"([^"]+)":\s*"([^"]+)"/g;
let match;
while ((match = iconMapRegex.exec(helpersContent)) !== null) {
  mappedIcons[match[1]] = match[2];
}

// Compare
const actualIconNames = Object.keys(actualIcons).sort();
const mappedIconNames = Object.keys(mappedIcons).sort();

console.log('=== ICON VERIFICATION REPORT ===\n');
console.log(`Total icons in repository: ${actualIconNames.length}`);
console.log(`Total icons in mapping: ${mappedIconNames.length}\n`);

// Find missing icons (in repo but not in our mapping)
const missingFromMapping = actualIconNames.filter(icon => !mappedIcons[icon]);
if (missingFromMapping.length > 0) {
  console.log(`❌ MISSING FROM MAPPING (${missingFromMapping.length} icons):`);
  console.log('Add these to helpers.ts:\n');
  
  // Group by category for easy copying
  const byCategory = {};
  missingFromMapping.forEach(icon => {
    const category = actualIcons[icon];
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(icon);
  });
  
  Object.keys(byCategory).sort().forEach(category => {
    console.log(`  // ${category}`);
    const icons = byCategory[category];
    for (let i = 0; i < icons.length; i += 3) {
      const chunk = icons.slice(i, i + 3);
      const line = chunk.map(icon => `"${icon}": "${category}"`).join(', ');
      console.log(`  ${line}${i + 3 < icons.length || category !== Object.keys(byCategory).sort().slice(-1)[0] ? ',' : ''}`);
    }
  });
  console.log();
}

// Find extra icons (in our mapping but not in repo)
const extraInMapping = mappedIconNames.filter(icon => !actualIcons[icon]);
if (extraInMapping.length > 0) {
  console.log(`⚠️  EXTRA IN MAPPING (${extraInMapping.length} icons - not in repo):`);
  extraInMapping.forEach(icon => {
    console.log(`  - ${icon} (mapped to ${mappedIcons[icon]})`);
  });
  console.log();
}

// Find incorrectly categorized icons
const miscategorized = [];
actualIconNames.forEach(icon => {
  if (mappedIcons[icon] && mappedIcons[icon] !== actualIcons[icon]) {
    miscategorized.push({
      icon,
      mapped: mappedIcons[icon],
      actual: actualIcons[icon]
    });
  }
});

if (miscategorized.length > 0) {
  console.log(`❌ INCORRECTLY CATEGORIZED (${miscategorized.length} icons):`);
  miscategorized.forEach(({ icon, mapped, actual }) => {
    console.log(`  - ${icon}: mapped to "${mapped}" but should be "${actual}"`);
  });
  console.log();
}

// Summary
if (missingFromMapping.length === 0 && extraInMapping.length === 0 && miscategorized.length === 0) {
  console.log('✅ ALL ICONS PROPERLY MAPPED!\n');
  process.exit(0);
} else {
  console.log('❌ ISSUES FOUND - Please fix the mapping in helpers.ts\n');
  process.exit(1);
}
