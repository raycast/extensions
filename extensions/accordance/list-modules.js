const { readFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

function parseModuleInfo(modulePath) {
  try {
    const plistPath = join(modulePath, 'Info.plist');
    if (!existsSync(plistPath)) return null;

    const plistContent = readFileSync(plistPath, 'utf8');
    const lines = plistContent.split('\n');

    const getValue = (key) => {
      const keyIndex = lines.findIndex(line => line.includes(`<key>${key}</key>`));
      if (keyIndex === -1 || keyIndex + 1 >= lines.length) return null;
      const valueLine = lines[keyIndex + 1];
      const match = valueLine.match(/<string>([^<]+)<\/string>/);
      return match ? match[1] : null;
    };

    const getInteger = (key) => {
      const keyIndex = lines.findIndex(line => line.includes(`<key>${key}</key>`));
      if (keyIndex === -1 || keyIndex + 1 >= lines.length) return null;
      const valueLine = lines[keyIndex + 1];
      const match = valueLine.match(/<integer>([^<]+)<\/integer>/);
      return match ? parseInt(match[1], 10) : null;
    };

    const fullName = getValue('com.oaktree.module.fullmodulename');
    const abbreviation = getValue('com.oaktree.module.humanreadablename') || getValue('com.oaktree.module.textabbr');
    const type = getInteger('com.oaktree.module.moduletype');

    return { fullName, abbreviation, type };
  } catch (error) {
    return null;
  }
}

const modulesDir = join(homedir(), 'Library', 'Application Support', 'Accordance', 'Modules');
const textsDir = join(modulesDir, 'Texts');
const toolsDir = join(modulesDir, 'Tools');

const allModules = [];

// Get text modules
if (existsSync(textsDir)) {
  const textDirs = readdirSync(textsDir).filter(dir => dir.endsWith('.atext'));
  for (const dir of textDirs) {
    const modulePath = join(textsDir, dir);
    const info = parseModuleInfo(modulePath);
    if (info) {
      allModules.push({
        ...info,
        category: 'Text',
        dirName: dir
      });
    }
  }
}

// Get tool modules
if (existsSync(toolsDir)) {
  const toolDirs = readdirSync(toolsDir).filter(dir => dir.endsWith('.atool'));
  for (const dir of toolDirs) {
    const modulePath = join(toolsDir, dir);
    const info = parseModuleInfo(modulePath);
    if (info) {
      allModules.push({
        ...info,
        category: 'Tool',
        dirName: dir
      });
    }
  }
}

// Sort by type, then by abbreviation
allModules.sort((a, b) => {
  if (a.type !== b.type) return a.type - b.type;
  return (a.abbreviation || '').localeCompare(b.abbreviation || '');
});

// Group by type
const typeGroups = {};
allModules.forEach(module => {
  if (!typeGroups[module.type]) {
    typeGroups[module.type] = [];
  }
  typeGroups[module.type].push(module);
});

// Output by type
Object.keys(typeGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(type => {
  console.log(`\n=== TYPE ${type} ===`);
  typeGroups[type].forEach(module => {
    const name = module.fullName?.substring(0, 60) + (module.fullName?.length > 60 ? '...' : '');
    console.log(`${module.abbreviation || 'NO_ABBR'} | ${name} | ${module.category}`);
  });
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total modules: ${allModules.length}`);
Object.keys(typeGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(type => {
  console.log(`Type ${type}: ${typeGroups[type].length} modules`);
});