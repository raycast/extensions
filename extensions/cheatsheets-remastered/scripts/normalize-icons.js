/*
 * Normalize all SVGs in assets/ to be monochrome and tintable:
 * - Remove width/height attributes (use viewBox scaling)
 * - Convert any colored fills/strokes/styles to black (#000)
 * - Keep fill="none" as-is; keep opacity attributes
 */
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

function normalizeSvgContent(svg) {
  let out = svg.toString();

  // Remove XML declaration for consistency
  out = out.replace(/^<\?xml[^>]*>\s*/i, '');

  // Remove width/height attributes on <svg>
  out = out.replace(/(<svg\b[^>]*?)\s+width="[^"]*"/gi, '$1');
  out = out.replace(/(<svg\b[^>]*?)\s+height="[^"]*"/gi, '$1');

  // Remove any root-level fill attributes on <svg>
  out = out.replace(/(<svg\b[^>]*?)\s+fill="(?!none)[^"]*"/gi, '$1');

  // Replace color fills on shapes to black, but keep fill="none"
  out = out.replace(/(fill=)"(?!none)(?!currentColor)[^"]*"/gi, 'fill="#000"');

  // Convert inline styles fill:...; to black, preserve fill:none
  out = out.replace(/style="([^"]*)"/gi, (m, style) => {
    let s = style
      .replace(/fill:\s*(?!none)(?!currentColor)[#a-zA-Z0-9().,\s%-]+/gi, 'fill:#000')
      .replace(/stroke:\s*(?!none)(?!currentColor)[#a-zA-Z0-9().,\s%-]+/gi, 'stroke:#000');
    return `style="${s}"`;
  });

  // Replace color strokes to black, keep stroke="none" as-is
  out = out.replace(/(stroke=)"(?!none)(?!currentColor)[^"]*"/gi, 'stroke="#000"');

  // Common color keywords to black
  out = out.replace(/(fill|stroke)="(white|#fff|#ffffff)"/gi, '$1="#000"');

  // Trim redundant whitespace
  out = out.replace(/\s{2,}/g, ' ');

  return out.trim();
}

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('Assets directory not found:', ASSETS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.toLowerCase().endsWith('.svg'));
  let changed = 0;

  for (const file of files) {
    const full = path.join(ASSETS_DIR, file);
    const original = fs.readFileSync(full, 'utf8');
    const normalized = normalizeSvgContent(original);
    if (normalized !== original) {
      fs.writeFileSync(full, normalized, 'utf8');
      changed++;
    }
  }

  console.log(`Normalized ${changed} SVGs out of ${files.length}`);
}

main();


