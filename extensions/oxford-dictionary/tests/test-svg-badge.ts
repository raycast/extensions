export function createWordBadgeSvg(word: string, isSelected: boolean): string {
  const charWidth = 7.5;
  const padding = 20;
  const width = Math.max(50, Math.round(word.length * charWidth + padding));
  const height = 24;
  const bg = isSelected ? '#525256' : '#262628';
  const border = isSelected ? '#ffffff' : '#3e3e42';
  const strokeWidth = isSelected ? 1.5 : 1;
  const textFill = '#ffffff';
  const fontWeight = isSelected ? '600' : '500';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" rx="5" ry="5" fill="${bg}" stroke="${border}" stroke-width="${strokeWidth}"/>
  <text x="${width / 2}" y="${height / 2 + 4}" fill="${textFill}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="${fontWeight}" text-anchor="middle">${word}</text>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

const unselected = createWordBadgeSvg('happy', false);
const selected = createWordBadgeSvg('happy', true);
console.log('Unselected base64 length:', unselected.length);
console.log('Selected base64 length:', selected.length);
console.log('Sample base64 URI:', unselected.slice(0, 60));

