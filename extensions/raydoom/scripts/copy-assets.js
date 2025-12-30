#!/usr/bin/env node
/**
 * Copy WASM assets from raydoom-core package to assets folder
 * This runs before building the extension
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const raydoomCorePath = require.resolve('raydoom-core');
const raydoomCoreDir = path.join(raydoomCorePath, '..', '..');
const assetsDir = path.join(__dirname, '..', 'assets');

console.log('Copying WASM assets from raydoom-core...');
console.log(`Source: ${raydoomCoreDir}`);
console.log(`Destination: ${assetsDir}`);

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const files = ['doom.js', 'doom.wasm'];
let copiedCount = 0;

for (const file of files) {
  const src = path.join(raydoomCoreDir, 'dist', file);
  const dest = path.join(assetsDir, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
    copiedCount++;
  } else {
    console.error(`✗ File not found: ${src}`);
  }
}

console.log(`\nCopied ${copiedCount}/${files.length} files successfully.`);

if (copiedCount !== files.length) {
  process.exit(1);
}
