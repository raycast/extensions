const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../assets/icon.svg');
const outputPath = path.join(__dirname, '../assets/icon.png');

sharp(inputPath)
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(outputPath)
  .then(info => {
    console.log('✓ Icon converted successfully: ' + outputPath);
    console.log('  Dimensions: ' + info.width + ' x ' + info.height + ' pixels');
  })
  .catch(err => {
    console.error('✗ Conversion failed:', err.message);
    process.exit(1);
  });
