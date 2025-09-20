async function createSimpleLGTM(text = "LGTM") {
  // Create a simple SVG with LGTM text
  const width = 512;
  const height = 512;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#4FC3F7;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2196F3;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="3" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `;

  // For now, return SVG as buffer (Raycast can handle SVG files)
  return Buffer.from(svg);
}

module.exports = {
  createSimpleLGTM,
};
