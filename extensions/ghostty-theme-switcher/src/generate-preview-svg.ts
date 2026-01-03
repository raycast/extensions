import { ThemeColors } from "./types";

export function generatePreviewSvg(colors: ThemeColors): string {
  const { background, foreground, palette } = colors;

  // Create a terminal-like preview with color blocks (3:2 aspect ratio)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" preserveAspectRatio="none">
  <!-- Background -->
  <rect width="300" height="200" fill="${background}"/>
  
  <!-- Title bar -->
  <circle cx="20" cy="16" r="6" fill="${palette[1] || "#ff5555"}"/>
  <circle cx="40" cy="16" r="6" fill="${palette[3] || "#f1fa8c"}"/>
  <circle cx="60" cy="16" r="6" fill="${palette[2] || "#50fa7b"}"/>
  
  <!-- Terminal content simulation -->
  <text x="16" y="55" font-family="monospace" font-size="14" fill="${palette[2] || "#50fa7b"}">$</text>
  <text x="32" y="55" font-family="monospace" font-size="14" fill="${foreground}">echo "Hello"</text>
  
  <text x="16" y="80" font-family="monospace" font-size="14" fill="${foreground}">Hello</text>
  
  <text x="16" y="105" font-family="monospace" font-size="14" fill="${palette[4] || "#bd93f9"}">~</text>
  <text x="32" y="105" font-family="monospace" font-size="14" fill="${palette[6] || "#8be9fd"}">git status</text>
  
  <!-- Color palette preview -->
  <g transform="translate(16, 135)">
    ${palette
      .slice(0, 8)
      .map((color, i) => `<rect x="${i * 34}" y="0" width="30" height="22" fill="${color}"/>`)
      .join("")}
  </g>
  <g transform="translate(16, 162)">
    ${palette
      .slice(8, 16)
      .map((color, i) => `<rect x="${i * 34}" y="0" width="30" height="22" fill="${color}"/>`)
      .join("")}
  </g>
</svg>`.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
