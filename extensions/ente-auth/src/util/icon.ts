import * as icons from 'simple-icons';
import { Service } from "./service";

export function icon(otp: Service) {
  const simpleIcon = icons[otp.name.toLocaleLowerCase()];
  if (simpleIcon) {
    return svgToBase64Image(simpleIcon.svg);
  }

  return toEmojiIcon(otp.name[0]);
}

function svgToBase64Image(svgString: string) {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(svgString);
  const base64 = Buffer.from(utf8Bytes).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

function toEmojiIcon(letter: string) {
  const upperLetter = letter.toUpperCase();
  let emoji = upperLetter;

  if (upperLetter >= 'A' && upperLetter <= 'Z') {
    emoji = String.fromCodePoint(0x1F170 + (upperLetter.charCodeAt(0) - 65));
  }

  return svgToBase64Image(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <text x="50" y="50" font-family="Arial, sans-serif" font-size="100" fill="black" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`);
}