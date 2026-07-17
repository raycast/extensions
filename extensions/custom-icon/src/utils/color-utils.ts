export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

/**
 * Parse any color string to RGBA values
 * Supports: HEX (#RGB, #RRGGBB, #RRGGBBAA), rgb(r,g,b), rgba(r,g,b,a)
 */
export function parseColor(color: string): RGBA | null {
  const trimmed = color.trim();

  // HEX format: #RGB, #RRGGBB, #RRGGBBAA
  const hexMatch = /^#?([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(trimmed);
  if (hexMatch) {
    let hex = hexMatch[1];

    // Expand shorthand (#RGB → #RRGGBB)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;

    return { r, g, b, a };
  }

  // RGBA format: rgba(r, g, b, a) where a is 0-1 or 0-255
  const rgbaMatch = /^rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(trimmed);
  if (rgbaMatch) {
    const r = Math.min(255, parseInt(rgbaMatch[1], 10));
    const g = Math.min(255, parseInt(rgbaMatch[2], 10));
    const b = Math.min(255, parseInt(rgbaMatch[3], 10));

    let a = 255;
    if (rgbaMatch[4] !== undefined) {
      const alphaValue = parseFloat(rgbaMatch[4]);
      // If alpha is <= 1, treat as 0-1 range; otherwise as 0-255
      a = alphaValue <= 1 ? Math.round(alphaValue * 255) : Math.min(255, Math.round(alphaValue));
    }

    return { r, g, b, a };
  }

  return null;
}

/**
 * Check if a color string is valid
 */
export function isValidColor(color: string): boolean {
  return parseColor(color) !== null;
}

/**
 * Parse hex color string to RGB values (for gradients)
 */
export function hexToRgb(hex: string): RGB {
  const parsed = parseColor(hex);
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : { r: 255, g: 255, b: 255 };
}

/**
 * Convert RGB to Jimp color (unsigned 32-bit integer RGBA)
 * Uses >>> 0 to ensure unsigned integer result (prevents negative overflow)
 */
export function rgbToJimpColor(r: number, g: number, b: number, a: number = 255): number {
  return (((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff)) >>> 0;
}

/**
 * Interpolate between two colors by a factor (0-1)
 */
export function interpolateColor(color1: RGB, color2: RGB, factor: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor),
  };
}

/**
 * Check if a point (x, y) is inside a rounded rectangle
 * Used for applying rounded corners to images
 */
export function isInsideRoundedRect(x: number, y: number, width: number, height: number, radius: number): boolean {
  const inLeftCorner = x < radius;
  const inRightCorner = x >= width - radius;
  const inTopCorner = y < radius;
  const inBottomCorner = y >= height - radius;

  // If not in any corner region, point is inside
  if (!inLeftCorner && !inRightCorner && !inTopCorner && !inBottomCorner) {
    return true;
  }

  // Determine which corner to check
  let cornerX: number, cornerY: number;

  if (inLeftCorner && inTopCorner) {
    cornerX = radius;
    cornerY = radius;
  } else if (inRightCorner && inTopCorner) {
    cornerX = width - radius;
    cornerY = radius;
  } else if (inLeftCorner && inBottomCorner) {
    cornerX = radius;
    cornerY = height - radius;
  } else if (inRightCorner && inBottomCorner) {
    cornerX = width - radius;
    cornerY = height - radius;
  } else {
    // Point is in edge region so it's inside
    return true;
  }

  // Check if point is within the corner radius
  const dx = x - cornerX;
  const dy = y - cornerY;
  return dx * dx + dy * dy <= radius * radius;
}
