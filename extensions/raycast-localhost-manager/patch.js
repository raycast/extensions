#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const extensionPath = '/Users/ricardokupper/raycast-extensions/raycast-localhost-manager';
const filePath = path.join(extensionPath, 'src', 'list-localhosts.tsx');
const backupPath = path.join(extensionPath, 'src', 'list-localhosts.backup.tsx');

// Read the original file
const originalContent = fs.readFileSync(filePath, 'utf8');

// Create a backup first
fs.writeFileSync(backupPath, originalContent);
console.log('Backup created: ' + backupPath);

// Create the fixed content
let fixedContent = originalContent;

// Add system binary paths constants after imports
const pathConstants = `
// System binary paths for macOS
const LSOF_PATH = "/usr/sbin/lsof";
const PS_PATH = "/bin/ps";
const KILL_PATH = "/bin/kill";
const DOCKER_PATHS = [
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker", 
  "/usr/bin/docker"
];

`;

// Insert path constants
fixedContent = fixedContent.replace(
  '// =====================\n// Types',
  pathConstants + '// =====================\n// Types'
);

// Replace all execa calls with absolute paths
fixedContent = fixedContent.replace(/await execa\("lsof"/g, 'await execa(LSOF_PATH');
fixedContent = fixedContent.replace(/await execa\("ps"/g, 'await execa(PS_PATH');
fixedContent = fixedContent.replace(/await execa\("kill"/g, 'await execa(KILL_PATH');

// Add findDockerPath function
const findDockerFunction = `async function findDockerPath() {
  for (const path of DOCKER_PATHS) {
    try {
      await execa(path, ["version", "--format", "{{.Server.Version}}"], { timeout: 1000 });
      return path;
    } catch {
      // Continue to next path
    }
  }
  return null;
}

`;

// Replace hasDocker function
fixedContent = fixedContent.replace(
  /async function hasDocker\(\)[^}]+\}/,
  findDockerFunction + `async function hasDocker() {
  const dockerPath = await findDockerPath();
  return dockerPath !== null;
}`
);

// Fix Docker commands
const dockerReplacements = [
  ['await execa(\n    "docker"', 'const dockerPath = await findDockerPath();\n  if (!dockerPath) return [];\n  \n  const { stdout } = await execa(\n    dockerPath'],
  ['await execa(\n      "docker"', 'const dockerPath = await findDockerPath();\n  if (!dockerPath) return stats;\n  \n  try {\n    const { stdout } = await execa(\n      dockerPath']
];

dockerReplacements.forEach(([search, replace]) => {
  const regex = new RegExp(search, 'g');
  fixedContent = fixedContent.replace(regex, replace);
});

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);
console.log('Fixed: ' + filePath);
console.log('Changes made:');
console.log('- Added absolute paths for system binaries');
console.log('- Added dynamic Docker path detection');
console.log('- Updated all execa calls');
