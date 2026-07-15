export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): [number, number, number] | undefined {
  const normalised = hex.trim().replace(/^#/, "");
  const full =
    normalised.length === 3 || normalised.length === 4
      ? normalised
          .slice(0, 3)
          .split("")
          .map((character) => character + character)
          .join("")
      : normalised.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return undefined;
  }

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getContrastRatio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getRelativeLuminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function hexToRgbOrThrow(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    throw new Error(`Expected a 6-digit hex color, received: ${hex}`);
  }

  return rgb;
}
