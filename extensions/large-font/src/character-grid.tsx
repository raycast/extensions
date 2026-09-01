import { Detail, environment, getPreferenceValues } from "@raycast/api";
import Graphemer from "graphemer";

type CharacterGridProps = { text?: string };

const CHARS_PER_ROW = 8;
const CELL_WIDTH = 125;
const CELL_HEIGHT = 190;
const MAX_DISPLAYED_CHARACTERS = 240;

function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function visibleCharacter(character: string): string {
  if (character === " ") return "·";
  if (character === "\t") return "⇥";
  if (character === "\n") return "↵";
  if (character === "\r") return "␍";
  return character;
}

function characterColor(character: string, colorCode: boolean, darkMode: boolean): string {
  const fallback = darkMode ? "#FFFFFF" : "#151515";
  if (!colorCode) return fallback;
  if (/^\p{N}$/u.test(character)) return darkMode ? "#61C6FF" : "#0069B4";
  if (/^\p{L}$/u.test(character)) return fallback;
  return darkMode ? "#FF8E8E" : "#C52222";
}

function gridMarkdown(text: string, preferences: Preferences): string {
  const splitter = new Graphemer();
  const allCharacters = splitter.splitGraphemes(text);
  const characters = allCharacters.slice(0, MAX_DISPLAYED_CHARACTERS);
  const truncatedCount = allCharacters.length - characters.length;
  const darkMode = environment.theme === "dark";
  const foreground = darkMode ? "#FFFFFF" : "#151515";
  const background = darkMode ? "#1B1B1B" : "#FFFFFF";
  const stripe = darkMode ? "#303030" : "#F0F0F0";
  const fontFamily =
    preferences.fontStyle === "monospace"
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      : "ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif";
  const rows = Math.ceil(characters.length / CHARS_PER_ROW);
  const width = Math.min(characters.length, CHARS_PER_ROW) * CELL_WIDTH;
  const height = Math.max(rows, 1) * CELL_HEIGHT;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="${background}" rx="16" />`;

  characters.forEach((character, index) => {
    const column = index % CHARS_PER_ROW;
    const row = Math.floor(index / CHARS_PER_ROW);
    const x = column * CELL_WIDTH;
    const y = row * CELL_HEIGHT;
    const glyph = escapeSvg(visibleCharacter(character));
    const label = String(index + 1).padStart(2, "0");
    const color = characterColor(character, preferences.colorCode, darkMode);
    const kind = character === " " ? "SPACE" : character === "\n" ? "NEW LINE" : character === "\t" ? "TAB" : "";

    if (index % 2 === 1)
      svg += `<rect x="${x}" y="${y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${stripe}" />`;
    svg += `<text x="${x + CELL_WIDTH / 2}" y="${y + 95}" text-anchor="middle" font-family="${fontFamily}" font-size="76" fill="${color}">${glyph}</text>`;
    svg += `<text x="${x + CELL_WIDTH / 2}" y="${y + 155}" text-anchor="middle" font-family="${fontFamily}" font-size="20" fill="${foreground}" opacity="0.58">${kind || label}</text>`;
  });

  svg += "</svg>";

  const image = `![Selected text character grid](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
  if (truncatedCount <= 0) return image;

  return `${image}\n\nShowing first ${characters.length} characters. ${truncatedCount} additional characters were omitted for performance.`;
}

export function CharacterGrid({ text }: CharacterGridProps) {
  const preferences = getPreferenceValues<Preferences>();

  if (text === undefined) return <Detail isLoading navigationTitle="Reading selected text…" />;
  if (text.length === 0) return <Detail markdown="## No text selected" />;

  return <Detail markdown={gridMarkdown(text, preferences)} navigationTitle={`${text.length} characters`} />;
}
