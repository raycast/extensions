const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#18181b" />
  
  <!-- Outer File Card -->
  <rect x="116" y="96" width="280" height="320" rx="28" fill="none" stroke="#3f3f46" stroke-width="16" />
  <path d="M 276 96 L 396 216" stroke="#3f3f46" stroke-width="16" fill="none" />
  <path d="M 276 96 L 276 216 L 396 216" fill="#27272a" />

  <!-- Compression Inward Arrows (Top & Bottom) -->
  <path d="M 256 160 L 256 220 M 236 200 L 256 220 L 276 200" stroke="#f4f4f5" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 256 352 L 256 292 M 236 312 L 256 292 L 276 312" stroke="#f4f4f5" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Center Target Core -->
  <circle cx="256" cy="256" r="14" fill="#f4f4f5" />
</svg>
`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'icon.png'))
  .then(() => console.log('icon.png created successfully!'))
  .catch((err) => {
    console.error('Failed to create icon:', err);
    process.exit(1);
  });
