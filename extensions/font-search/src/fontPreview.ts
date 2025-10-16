import { Color } from "@raycast/api";
export function createFontPreviewSVG(fontName: string, text: string): string {
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">
      <style>
        text {
          font-size: 24px;
          fill: ${Color.PrimaryText};
          filter: saturate(0);
        }
      </style>
      <text font-family="${fontName}" x="10" y="70">${text}</text>
      <text font-family="${fontName}" x="10" y="120">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text>
      <text font-family="${fontName}" x="10" y="170">abcdefghijklmnopqrstuvwxyz</text>
      <text font-family="${fontName}" x="10" y="220">0123456789!@#$%^()_+-={}[]:;</text>
    </svg>
  `;

  return `![Font preview](data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")})`;
}
