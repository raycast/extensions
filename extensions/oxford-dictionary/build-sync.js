const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const distDir = path.join(projectRoot, 'dist');
const configDir = 'C:/Users/Johno/.config/raycast/extensions/oxford-dictionary';

// 1. Copy WordNet DB and assets to dist and runtime
const wordnetSrc = path.join(projectRoot, 'assets', 'wordnet-db');
const distDbDest = path.join(distDir, 'node_modules', 'db');
const rootDbDest = path.join(projectRoot, 'node_modules', 'db');
if (fs.existsSync(wordnetSrc)) {
  fs.cpSync(wordnetSrc, distDbDest, { recursive: true, force: true });
  fs.cpSync(wordnetSrc, rootDbDest, { recursive: true, force: true });
}

const rogetSrc = path.join(projectRoot, 'assets', 'roget-thesaurus.json');
const vecBinSrc = path.join(projectRoot, 'assets', 'word-vectors.bin');
const vecVocabSrc = path.join(projectRoot, 'assets', 'word-vectors.vocab.json');
const distAssets = path.join(distDir, 'assets');
const configAssets = path.join(configDir, 'assets');

fs.mkdirSync(distAssets, { recursive: true });
fs.mkdirSync(configAssets, { recursive: true });

if (fs.existsSync(rogetSrc)) {
  fs.copyFileSync(rogetSrc, path.join(distAssets, 'roget-thesaurus.json'));
  fs.copyFileSync(rogetSrc, path.join(configAssets, 'roget-thesaurus.json'));
}

if (fs.existsSync(vecBinSrc)) {
  fs.copyFileSync(vecBinSrc, path.join(distAssets, 'word-vectors.bin'));
  fs.copyFileSync(vecBinSrc, path.join(configAssets, 'word-vectors.bin'));
}

if (fs.existsSync(vecVocabSrc)) {
  fs.copyFileSync(vecVocabSrc, path.join(distAssets, 'word-vectors.vocab.json'));
  fs.copyFileSync(vecVocabSrc, path.join(configAssets, 'word-vectors.vocab.json'));
}

for (const file of [
  'def.js',
  'pronounce.js',
  'roget.js',
  'wrd.js',
  'vec.js',
  'synonyms.js',
  'def.js.map',
  'pronounce.js.map',
  'roget.js.map',
  'wrd.js.map',
  'vec.js.map',
  'synonyms.js.map',
]) {
  const src = path.join(distDir, file);
  const dest = path.join(projectRoot, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// 3. Sync dist, package.json, and icon to .config/raycast/extensions/oxford-dictionary (Raycast runtime directory)
try {
  fs.mkdirSync(configDir, { recursive: true });
  fs.cpSync(distDir, configDir, { recursive: true, force: true });
  const iconSrc = path.join(projectRoot, 'command-icon.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(configDir, 'command-icon.png'));
    fs.copyFileSync(iconSrc, path.join(distDir, 'command-icon.png'));
  }
  const pkgSrc = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgSrc)) {
    fs.copyFileSync(pkgSrc, path.join(configDir, 'package.json'));
  }
  console.log('[build-sync] Synced successfully to runtime and project directories!');
} catch (err) {
  console.error('[build-sync] Error syncing:', err);
}
