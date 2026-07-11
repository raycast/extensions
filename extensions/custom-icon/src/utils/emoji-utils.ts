import { Jimp } from "jimp";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
// Import emoji data directly so it gets bundled
import emojiData from "emoji-datasource-apple/emoji.json";
import { EmojiData, EmojiItem } from "../type";
import { CURATED_EMOJIS, SHEET_PADDING, SHEET_SIZE } from "./constants";

// Cast the imported data to proper type
const typedEmojiData = emojiData as EmojiData[];

// Create lookup map once
const emojiLookup = new Map<string, EmojiData>();
for (const emoji of typedEmojiData) {
  emojiLookup.set(emoji.short_name, emoji);
}

/**
 * Get emoji data by short_name
 */
export function getEmojiByShortName(shortName: string): EmojiData | undefined {
  return emojiLookup.get(shortName);
}

/**
 * Get emoji native character from unified codepoint
 */
function unifiedToChar(unified: string): string {
  const codePoints = unified.split("-").map((cp) => parseInt(cp, 16));
  return String.fromCodePoint(...codePoints);
}

/**
 * Get emoji native character by short_name
 */
export function getEmojiChar(shortName: string): string {
  const emoji = emojiLookup.get(shortName);
  if (!emoji) return "?";
  return unifiedToChar(emoji.unified);
}

/**
 * Format emoji name for display (Title Case)
 */
function formatEmojiName(name: string): string {
  return name
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get curated emoji list for dropdown, grouped by category
 * Returns emoji data without image paths (uses native characters for UI)
 */
export function getCuratedEmojis(): Map<string, EmojiItem[]> {
  const result = new Map<string, EmojiItem[]>();

  for (const [category, shortNames] of Object.entries(CURATED_EMOJIS)) {
    const items: EmojiItem[] = [];

    for (const shortName of shortNames) {
      const emoji = emojiLookup.get(shortName);
      if (emoji && emoji.has_img_apple) {
        items.push({
          shortName: emoji.short_name,
          displayName: formatEmojiName(emoji.name),
          emojiChar: unifiedToChar(emoji.unified),
          category,
          sheetX: emoji.sheet_x,
          sheetY: emoji.sheet_y,
        });
      }
    }

    if (items.length > 0) {
      result.set(category, items);
    }
  }

  return result;
}

/**
 * Extract an emoji image from the spritesheet and save to temp file
 * The spritesheet must be bundled in assets folder
 */
export async function extractEmojiImage(spritesheetPath: string, shortName: string): Promise<string | null> {
  const emoji = emojiLookup.get(shortName);
  if (!emoji || !emoji.has_img_apple) {
    return null;
  }

  try {
    // Load the spritesheet
    const spritesheet = await Jimp.read(spritesheetPath);

    // Calculate position in spritesheet
    // Formula from emoji-data docs: x = (sheet_x * (sheet_size + 2)) + 1
    const cellSize = SHEET_SIZE + SHEET_PADDING * 2; // 66px total cell
    const x = emoji.sheet_x * cellSize + SHEET_PADDING;
    const y = emoji.sheet_y * cellSize + SHEET_PADDING;

    // Crop the emoji from the spritesheet
    const emojiImage = spritesheet.crop({ x, y, w: SHEET_SIZE, h: SHEET_SIZE });

    // Save to temp file
    const outputPath = join(tmpdir(), `emoji-${shortName}-${randomUUID()}.png`);
    await emojiImage.write(outputPath as `${string}.${string}`);

    return outputPath;
  } catch (error) {
    console.error(`Failed to extract emoji ${shortName}:`, error);
    return null;
  }
}
