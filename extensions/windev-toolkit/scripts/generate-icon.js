const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create 512x512 icon
const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background - dark blue gradient
const gradient = ctx.createLinearGradient(0, 0, size, size);
gradient.addColorStop(0, '#1a1a2e');
gradient.addColorStop(1, '#16213e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, size, size);

// Draw network/port symbol
ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 24;
ctx.lineCap = 'round';

// Center circle (hub)
ctx.beginPath();
ctx.arc(size/2, size/2, 80, 0, Math.PI * 2);
ctx.stroke();

// Inner filled circle
ctx.fillStyle = '#00d4ff';
ctx.beginPath();
ctx.arc(size/2, size/2, 40, 0, Math.PI * 2);
ctx.fill();

// Connection lines radiating out
const lines = [
  { angle: -Math.PI/4, length: 140 },
  { angle: Math.PI/4, length: 140 },
  { angle: 3*Math.PI/4, length: 140 },
  { angle: -3*Math.PI/4, length: 140 },
];

ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 16;

lines.forEach(({ angle, length }) => {
  const startX = size/2 + Math.cos(angle) * 80;
  const startY = size/2 + Math.sin(angle) * 80;
  const endX = size/2 + Math.cos(angle) * (80 + length);
  const endY = size/2 + Math.sin(angle) * (80 + length);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // End dots
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(endX, endY, 24, 0, Math.PI * 2);
  ctx.fill();
});

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, '../assets/command-icon.png'), buffer);
console.log('Icon created: assets/command-icon.png');
