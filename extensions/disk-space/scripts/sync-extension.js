const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const distDir = path.join(srcDir, 'dist');
const targets = [
  path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'raycast', 'extensions', 'disk-space'),
  path.join(process.env.LOCALAPPDATA || '', 'Raycast', 'extensions', 'disk-space'),
  path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'raycast', 'extensions', 'storage-space-view'),
  path.join(process.env.LOCALAPPDATA || '', 'Raycast', 'extensions', 'storage-space-view'),
];

for (const target of targets) {
  if (!target) continue;
  try {
    fs.mkdirSync(target, { recursive: true });
    if (fs.existsSync(distDir)) {
      fs.cpSync(distDir, target, { recursive: true, force: true });
    }
    const iconPath = path.join(srcDir, 'extension-icon.png');
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, path.join(target, 'extension-icon.png'));
    }
    const pkgPath = path.join(srcDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      fs.copyFileSync(pkgPath, path.join(target, 'package.json'));
    }
    console.log(`Successfully synced to ${target}`);
  } catch (err) {
    console.warn(`Sync notice for ${target}:`, err.message);
  }
}
