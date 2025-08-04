// Copyright © 2025
// All rights reserved.

const fs = require('fs');
const path = require('path');

console.log('IP Finder Icon Creation');
console.log('=======================');
console.log('');

console.log('I\'ve created SVG icons for your IP Finder plugin:');
console.log('');
console.log('1. icon.svg - Detailed network scanning icon');
console.log('2. icon-simple.svg - Clean, Raycast-style icon');
console.log('');

console.log('To convert SVG to PNG, you have several options:');
console.log('');

console.log('Option 1: Online Converters');
console.log('- Visit https://convertio.co/svg-png/');
console.log('- Upload the SVG file');
console.log('- Download as PNG');
console.log('- Rename to "command-icon.png"');
console.log('');

console.log('Option 2: Using Inkscape (Free)');
console.log('- Install Inkscape: https://inkscape.org/');
console.log('- Open the SVG file');
console.log('- File > Export PNG Image');
console.log('- Set size to 512x512 pixels');
console.log('- Export as "command-icon.png"');
console.log('');

console.log('Option 3: Using ImageMagick');
console.log('- Install ImageMagick: https://imagemagick.org/');
console.log('- Run: convert icon-simple.svg -resize 512x512 command-icon.png');
console.log('');

console.log('Option 4: Using Node.js (if you have the packages)');
console.log('- npm install sharp');
console.log('- Run the conversion script below');
console.log('');

console.log('Option 5: Browser Method');
console.log('- Open the SVG file in a web browser');
console.log('- Right-click and "Save as" or take a screenshot');
console.log('- Resize to 512x512 pixels');
console.log('');

console.log('Recommended: Use the "icon-simple.svg" for a clean, modern look');
console.log('that matches Raycast\'s design language.');
console.log('');

// Check if sharp is available for automatic conversion
try {
  const sharp = require('sharp');
  
  console.log('Sharp detected! Converting SVG to PNG automatically...');
  
  sharp('icon-simple.svg')
    .resize(512, 512)
    .png()
    .toFile('command-icon.png')
    .then(() => {
      console.log('✅ Icon created successfully: command-icon.png');
      console.log('');
      console.log('The icon is now ready for your Raycast plugin!');
    })
    .catch((err) => {
      console.log('❌ Error creating icon:', err.message);
      console.log('Please use one of the manual methods above.');
    });
    
} catch (error) {
  console.log('Sharp not available. Please use one of the manual methods above.');
  console.log('');
  console.log('To install sharp for automatic conversion:');
  console.log('npm install sharp');
  console.log('');
}

console.log('Icon Design Features:');
console.log('- Network grid pattern representing connected devices');
console.log('- Scanning radar animation (rotating line)');
console.log('- Clean, modern Raycast-style design');
console.log('- Blue color scheme (#007AFF) matching Raycast');
console.log('- 512x512 pixel resolution');
console.log('- Rounded corners for modern look'); 