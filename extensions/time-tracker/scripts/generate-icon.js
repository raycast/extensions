#!/usr/bin/env node

/**
 * Generate command-icon.png from Lucide icon
 * Downloads clock-plus SVG and converts to 512x512 PNG
 */

const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const ICON_NAME = 'clock-plus';
const ICON_SIZE = 512;
const SVG_URL = `https://unpkg.com/lucide-static@latest/icons/${ICON_NAME}.svg`;
const OUTPUT_PATH = path.join(__dirname, '..', 'command-icon.png');
const TEMP_SVG = path.join(__dirname, '..', 'temp-icon.svg');

console.log('📥 Downloading Lucide clock-plus icon...');

https.get(SVG_URL, (response) => {
  let data = '';

  response.on('data', (chunk) => data += chunk);

  response.on('end', () => {
    // Modify SVG to add padding and background
    const modifiedSvg = data
      .replace('<svg', `<svg width="${ICON_SIZE}" height="${ICON_SIZE}"`)
      .replace('width="24"', '')
      .replace('height="24"', '')
      .replace('<svg', '<svg style="padding: 64px; background: transparent"');

    fs.writeFileSync(TEMP_SVG, modifiedSvg);
    console.log('✅ SVG downloaded');

    // Check if ImageMagick/rsvg-convert is available
    checkConverter();
  });
}).on('error', (err) => {
  console.error('❌ Download failed:', err.message);
  console.log('\n💡 Manual steps:');
  console.log(`1. Download: ${SVG_URL}`);
  console.log('2. Convert to PNG 512x512 using: https://convertio.co/svg-png/');
  console.log('3. Save as command-icon.png');
  process.exit(1);
});

function checkConverter() {
  // Try rsvg-convert (preferred)
  exec('which rsvg-convert', (error) => {
    if (!error) {
      convertWithRsvg();
    } else {
      // Try ImageMagick
      exec('which convert', (error) => {
        if (!error) {
          convertWithImageMagick();
        } else {
          provideFallbackInstructions();
        }
      });
    }
  });
}

function convertWithRsvg() {
  console.log('🎨 Converting with rsvg-convert...');
  exec(`rsvg-convert -w ${ICON_SIZE} -h ${ICON_SIZE} "${TEMP_SVG}" -o "${OUTPUT_PATH}"`, (error) => {
    cleanup();
    if (error) {
      provideFallbackInstructions();
    } else {
      console.log(`✅ Icon created: ${OUTPUT_PATH}`);
    }
  });
}

function convertWithImageMagick() {
  console.log('🎨 Converting with ImageMagick...');
  exec(`convert -background transparent -size ${ICON_SIZE}x${ICON_SIZE} "${TEMP_SVG}" "${OUTPUT_PATH}"`, (error) => {
    cleanup();
    if (error) {
      provideFallbackInstructions();
    } else {
      console.log(`✅ Icon created: ${OUTPUT_PATH}`);
    }
  });
}

function provideFallbackInstructions() {
  console.log('\n⚠️  No SVG converter found.');
  console.log('\n📦 Install one of these:');
  console.log('  brew install librsvg       # macOS (recommended)');
  console.log('  brew install imagemagick   # macOS (alternative)');
  console.log('  apt install librsvg2-bin   # Linux');
  console.log('\n💡 Or convert manually:');
  console.log(`  SVG saved at: ${TEMP_SVG}`);
  console.log('  Convert online: https://convertio.co/svg-png/');
  console.log('  Size: 512x512px');
  process.exit(1);
}

function cleanup() {
  try {
    if (fs.existsSync(TEMP_SVG)) {
      fs.unlinkSync(TEMP_SVG);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}
