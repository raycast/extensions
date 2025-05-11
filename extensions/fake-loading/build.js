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

// Create loadings directory in dist/assets if it doesn't exist
if (!fs.existsSync(path.join('dist', 'assets', 'loadings'))) {
  fs.mkdirSync(path.join('dist', 'assets', 'loadings'), { recursive: true });
}

// Copy assets
console.log('Copying assets...');
try {
  // Copy the loadings directory specifically
  if (fs.existsSync(path.join('assets', 'loadings'))) {
    execSync('cp -r assets/loadings/* dist/assets/loadings/');
  }
  
  // Copy other assets
  const assetFiles = fs.readdirSync('assets').filter(file => 
    !fs.statSync(path.join('assets', file)).isDirectory() || file !== 'loadings');
  
  for (const file of assetFiles) {
    const sourcePath = path.join('assets', file);
    const destPath = path.join('dist', 'assets', file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      execSync(`cp -r "${sourcePath}" "${path.join('dist', 'assets')}"`);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
} catch (error) {
  console.log('Error copying assets:', error.message);
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
