const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Create assets directory in dist if it doesn't exist
if (!fs.existsSync(path.join('dist', 'assets'))) {
  fs.mkdirSync(path.join('dist', 'assets'), { recursive: true });
}

// Copy assets
console.log('Copying assets...');
try {
  execSync('cp -r assets/* dist/assets/');
} catch (error) {
  console.log('No assets to copy or error copying assets');
}

// Copy package.json and other config files
console.log('Copying configuration files...');
fs.copyFileSync('package.json', path.join('dist', 'package.json'));
if (fs.existsSync('.raycastrc')) {
  fs.copyFileSync('.raycastrc', path.join('dist', '.raycastrc'));
}
if (fs.existsSync('icon.png')) {
  fs.copyFileSync('icon.png', path.join('dist', 'icon.png'));
}

// Create src directory in dist
if (!fs.existsSync(path.join('dist', 'src'))) {
  fs.mkdirSync(path.join('dist', 'src'), { recursive: true });
}

// Process the source file - keep ES6 imports
console.log('Processing source files...');
let srcContent = fs.readFileSync('src/index.tsx', 'utf8');

// Remove TypeScript type annotations
srcContent = srcContent.replace(/: unknown/g, '');
srcContent = srcContent.replace(/\?: \{ title\?: string \}/g, '');
srcContent = srcContent.replace(/: string/g, '');
srcContent = srcContent.replace(/interface LoadingScreen \{[\s\S]*?\}/g, '');
srcContent = srcContent.replace(/: LoadingScreen\[\]/g, '');

// Write the file to dist
fs.writeFileSync(path.join('dist', 'src', 'index.js'), srcContent);

console.log('Build completed successfully!');
