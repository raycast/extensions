import { oklch } from "culori";
import type { ParsedColor } from "./colorParsers";

export interface ColorOutput {
  format: string;
  value: string;
  displayName: string;
}

/**
 * Convert RGB values to hex format
 */
export function toHex(color: ParsedColor): ColorOutput {
  const { r, g, b, a } = color;

  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");

  let value = `#${hex}`;
  if (a !== undefined && a < 1) {
    const alphaHex = Math.round(a * 255)
      .toString(16)
      .padStart(2, "0");
    value += alphaHex;
  }

  return {
    format: "hex",
    value: value.toUpperCase(),
    displayName: "Hex",
  };
}

/**
 * Convert RGB values to RGB/RGBA format
 */
export function toRGB(color: ParsedColor): ColorOutput {
  const { r, g, b, a } = color;

  if (a !== undefined && a < 1) {
    return {
      format: "rgba",
      value: `rgba(${r}, ${g}, ${b}, ${a})`,
      displayName: "RGBA",
    };
  }

  return {
    format: "rgb",
    value: `rgb(${r}, ${g}, ${b})`,
    displayName: "RGB",
  };
}

/**
 * Convert RGB values to OKLCH format using culori
 */
export function toOKLCH(color: ParsedColor): ColorOutput {
  const { r, g, b, a } = color;

  // Convert to 0-1 range for culori
  const rgbColor = {
    mode: "rgb" as const,
    r: r / 255,
    g: g / 255,
    b: b / 255,
    alpha: a,
  };

  try {
    const oklchColor = oklch(rgbColor);
    if (!oklchColor) {
      throw new Error("Failed to convert to OKLCH");
    }

    const l = (oklchColor.l || 0).toFixed(3);
    const c = (oklchColor.c || 0).toFixed(3);
    const h = (oklchColor.h || 0).toFixed(1);

    let value = `oklch(${l} ${c} ${h}`;
    if (a !== undefined && a < 1) {
      value += ` / ${a}`;
    }
    value += ")";

    return {
      format: "oklch",
      value,
      displayName: "OKLCH",
    };
  } catch {
    // Fallback if culori fails
    return {
      format: "oklch",
      value: "oklch(0.5 0.1 0)",
      displayName: "OKLCH",
    };
  }
}

/**
 * Convert RGB values to SwiftUI Color format
 */
export function toSwiftUI(color: ParsedColor): ColorOutput {
  const { r, g, b, a } = color;

  // Convert to 0-1 range
  const red = (r / 255).toFixed(3);
  const green = (g / 255).toFixed(3);
  const blue = (b / 255).toFixed(3);

  let value = `Color(red: ${red}, green: ${green}, blue: ${blue}`;
  if (a !== undefined && a < 1) {
    value += `, opacity: ${a.toFixed(3)}`;
  }
  value += ")";

  return {
    format: "swiftui",
    value,
    displayName: "SwiftUI Color",
  };
}

/**
 * Convert RGB values to UIColor format
 */
export function toUIColor(color: ParsedColor): ColorOutput {
  const { r, g, b, a } = color;

  // Convert to 0-1 range
  const red = (r / 255).toFixed(3);
  const green = (g / 255).toFixed(3);
  const blue = (b / 255).toFixed(3);
  const alpha = a !== undefined ? a.toFixed(3) : "1.0";

  const value = `UIColor(red: ${red}, green: ${green}, blue: ${blue}, alpha: ${alpha})`;

  return {
    format: "uicolor",
    value,
    displayName: "UIColor",
  };
}

/**
 * Get the preferred format based on input format
 * Hex -> RGB, anything else -> Hex
 */
export function getPreferredFormat(inputFormat: string): "hex" | "rgb" {
  return inputFormat === "hex" ? "rgb" : "hex";
}

/**
 * Convert parsed color to all supported formats
 */
export function convertToAllFormats(color: ParsedColor): ColorOutput[] {
  return [
    toHex(color),
    toRGB(color),
    toOKLCH(color),
    toSwiftUI(color),
    toUIColor(color),
  ];
}
