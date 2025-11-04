const { readFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

function parseModuleInfo(modulePath) {
  const plistPath = join(modulePath, 'Info.plist');
  const plistContent = readFileSync(plistPath, 'utf8');
  const lines = plistContent.split('\n');

  const getValue = (key) => {
    const keyIndex = lines.findIndex(line => line.includes(`<key>${key}</key>`));
    if (keyIndex === -1 || keyIndex + 1 >= lines.length) return null;
    const valueLine = lines[keyIndex + 1];
    const match = valueLine.match(/<string>([^<]+)<\/string>/);
    return match ? match[1] : null;
  };

  const getTags = () => {
    const tagsStartIndex = lines.findIndex(line => line.includes('<key>com.oaktree.module.tagsarray</key>'));
    if (tagsStartIndex === -1) return [];

    const tagsSection = lines.slice(tagsStartIndex + 1);
    const tagsEndIndex = tagsSection.findIndex(line => line.includes('</array>'));
    if (tagsEndIndex === -1) return [];

    const tagLines = tagsSection.slice(0, tagsEndIndex);
    return tagLines
      .map(line => {
        const match = line.match(/<string>([^<]+)<\/string>/);
        return match ? match[1] : null;
      })
      .filter(tag => tag !== null);
  };

  const fullName = getValue('com.oaktree.module.fullmodulename');
  const abbreviation = getValue('com.oaktree.module.humanreadablename') || getValue('com.oaktree.module.textabbr');
  const tags = getTags();

  return { fullName, abbreviation, tags };
}

const modulesDir = join(homedir(), 'Library', 'Application Support', 'Accordance', 'Modules');
const toolsDir = join(modulesDir, 'Tools');

const type6Modules = [];

// Get type 6 tool modules
if (existsSync(toolsDir)) {
  const toolDirs = readdirSync(toolsDir).filter(dir => dir.endsWith('.atool'));
  for (const dir of toolDirs) {
    try {
      const modulePath = join(toolsDir, dir);
      const plistPath = join(modulePath, 'Info.plist');
      if (!existsSync(plistPath)) continue;

      const plistContent = readFileSync(plistPath, 'utf8');
      const typeMatch = plistContent.match(/<key>com\.oaktree\.module\.moduletype<\/key>\s*<integer>(\d+)<\/integer>/);
      if (typeMatch && parseInt(typeMatch[1]) === 6) {
        const info = parseModuleInfo(modulePath);
        type6Modules.push({ ...info, path: dir });
      }
    } catch (e) {
      // Skip errors
    }
  }
}

// Analyze tags
console.log('=== TYPE 6 MODULES BY TAGS ===\n');

const tagGroups = {};
const noTags = [];

for (const module of type6Modules) {
  if (module.tags && module.tags.length > 0) {
    const primaryTag = module.tags[0]; // Use first tag as primary category
    if (!tagGroups[primaryTag]) {
      tagGroups[primaryTag] = [];
    }
    tagGroups[primaryTag].push(module);
  } else {
    noTags.push(module);
  }
}

// Display by tag groups
Object.keys(tagGroups).sort().forEach(tag => {
  const modules = tagGroups[tag];
  console.log(`=== ${tag.toUpperCase()} (${modules.length} modules) ===`);
  modules.forEach(module => {
    console.log(`${module.abbreviation} - ${module.fullName?.substring(0, 60)}`);
  });
  console.log('');
});

if (noTags.length > 0) {
  console.log(`=== NO TAGS (${noTags.length} modules) ===`);
  noTags.forEach(module => {
    console.log(`${module.abbreviation} - ${module.fullName?.substring(0, 60)}`);
  });
}

console.log(`\n=== SUMMARY ===`);
console.log('Tag categories found:', Object.keys(tagGroups).length);
console.log('Modules with tags:', Object.values(tagGroups).flat().length);
console.log('Modules without tags:', noTags.length);
console.log('Total type 6 modules:', type6Modules.length);