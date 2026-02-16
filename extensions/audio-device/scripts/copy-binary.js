#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Only copy binary on macOS
if (process.platform === 'darwin') {
  const source = path.join(__dirname, '..', 'node_modules', '@spotxyz', 'macos-audio-devices', 'audio-devices');
  const dest = path.join(__dirname, '..', 'assets', 'audio-devices');

  // Ensure assets directory exists
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Copy the binary
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log('Copied audio-devices binary to assets/');
  } else {
    console.error('Source binary not found:', source);
    process.exit(1);
  }
} else {
  console.log('Skipping binary copy (not macOS)');
}
