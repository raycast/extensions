// Copyright © 2025
// All rights reserved.

const sharp = require('sharp');
const fs = require('fs');

async function createStoreIcon() {
  try {
    // Create a 512x512 icon for the store
    const svgContent = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="grid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:#E5E7EB;stop-opacity:0.7" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="512" height="512" rx="128" fill="url(#bg)"/>
      
      <!-- Network Grid -->
      <g fill="url(#grid)" opacity="0.8">
        <!-- Horizontal lines -->
        <rect x="64" y="128" width="384" height="4" rx="2"/>
        <rect x="64" y="256" width="384" height="4" rx="2"/>
        <rect x="64" y="384" width="384" height="4" rx="2"/>
        
        <!-- Vertical lines -->
        <rect x="128" y="64" width="4" height="384" rx="2"/>
        <rect x="256" y="64" width="4" height="384" rx="2"/>
        <rect x="384" y="64" width="4" height="384" rx="2"/>
      </g>
      
      <!-- Network Nodes -->
      <circle cx="128" cy="128" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="256" cy="128" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="384" cy="128" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="128" cy="256" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="256" cy="256" r="16" fill="#10B981" opacity="0.9"/>
      <circle cx="384" cy="256" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="128" cy="384" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="256" cy="384" r="16" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="384" cy="384" r="16" fill="#FFFFFF" opacity="0.9"/>
      
      <!-- Scanning Animation -->
      <circle cx="256" cy="256" r="80" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.6">
        <animate attributeName="r" values="80;120;80" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      <!-- IP Text -->
      <text x="256" y="460" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="24" font-weight="bold">IP FINDER</text>
    </svg>
    `;

    // Convert SVG to PNG
    await sharp(Buffer.from(svgContent))
      .resize(512, 512)
      .png()
      .toFile('store-icon.png');

    console.log('✅ Store icon created: store-icon.png (512x512)');
    
    // Also create a smaller version for the command icon
    await sharp(Buffer.from(svgContent))
      .resize(85, 85)
      .png()
      .toFile('command-icon.png');

    console.log('✅ Command icon updated: command-icon.png (85x85)');
    
  } catch (error) {
    console.error('❌ Error creating store icon:', error);
  }
}

createStoreIcon(); 