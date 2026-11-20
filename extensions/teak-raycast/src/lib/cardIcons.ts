import { Color, Icon, Image } from "@raycast/api";
import type { RaycastCard } from "./api";

const TYPE_ICONS: Record<string, Icon> = {
  audio: Icon.Waveform,
  document: Icon.Document,
  image: Icon.Image,
  link: Icon.Link,
  palette: Icon.Swatch,
  quote: Icon.QuoteBlock,
  text: Icon.Text,
  video: Icon.Video,
};

const TYPE_TINTS: Record<string, Color> = {
  audio: Color.Orange,
  document: Color.SecondaryText,
  image: Color.Magenta,
  link: Color.Blue,
  palette: Color.Purple,
  quote: Color.Green,
  text: Color.SecondaryText,
  video: Color.Red,
};

export const getCardTypeIcon = (card: Pick<RaycastCard, "type">): Icon =>
  TYPE_ICONS[card.type] ?? Icon.Document;

const tintedTypeIcon = (card: Pick<RaycastCard, "type">): Image => ({
  source: getCardTypeIcon(card),
  tintColor: TYPE_TINTS[card.type] ?? Color.SecondaryText,
});

// Relative luminance (WCAG) of a #rgb or #rrggbb color, 0 for black to 1 for white.
const luminance = (hex: string): number | null => {
  const digits = hex.replace("#", "");
  const full =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit).join("")
      : digits.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = Number.parseInt(full.slice(start, start + 2), 16) / 255;
    return channel <= 0.040_45
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The palette's first color that stands out on a light (or dark) list. */
export const swatchColor = (
  hexes: string[],
  theme: "light" | "dark",
): string | undefined =>
  hexes.find((hex) => {
    const value = luminance(hex);
    if (value === null) {
      return false;
    }
    return theme === "light" ? value < 0.7 : value > 0.06;
  }) ?? hexes[0];

/**
 * The icon a card shows in a list: its picture for images and videos, a
 * color from its palette for palettes, and a tinted type icon for everything
 * else.
 */
export const getCardListIcon = (
  card: Pick<RaycastCard, "colors" | "thumbnailUrl" | "type">,
): Image.ImageLike => {
  if ((card.type === "image" || card.type === "video") && card.thumbnailUrl) {
    return {
      fallback: getCardTypeIcon(card),
      mask: Image.Mask.RoundedRectangle,
      source: card.thumbnailUrl,
    };
  }
  const hexes = (card.colors ?? []).map((color) => color.hex);
  const light = swatchColor(hexes, "light");
  const dark = swatchColor(hexes, "dark");
  if (card.type === "palette" && light && dark) {
    // Raycast shifts tints for contrast by default, which would show a
    // palette's yellow as olive; a swatch should show its real color.
    return {
      source: Icon.CircleFilled,
      tintColor: { adjustContrast: false, dark, light },
    };
  }
  return tintedTypeIcon(card);
};
