import * as icons from 'simple-icons';
import { Service } from "./service";

export function icon(otp: Service, color: string = '#000000') {
  const simpleIcon = icons[otp.name.toLocaleLowerCase()];
  if (simpleIcon) {
    const coloredSvg = changeIconColor(simpleIcon.svg, color);
    return svgToBase64Image(coloredSvg);
  }

  return toEmojiIcon(otp.name[0], color);
}

function changeIconColor(svg: string, color: string): string {
  return svg.replace('<svg', `<svg fill="${color}"`);
}

function svgToBase64Image(svgString: string) {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(svgString);
  const base64 = Buffer.from(utf8Bytes).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

function toEmojiIcon(letter: string, color: string) {
  const upperLetter = letter.toUpperCase();
  let emoji = upperLetter;

  if (upperLetter >= 'A' && upperLetter <= 'Z') {
    emoji = String.fromCodePoint(0x1F170 + (upperLetter.charCodeAt(0) - 65));
  }

  const svg = changeIconColor(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <text x="50" y="50" font-family="Arial, sans-serif" font-size="100" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`, color);

  return svgToBase64Image(svg);
}