import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Tool } from "@raycast/api";
import { buildQRProps } from "../generate-qr";
import { buildPNGBuffer } from "../qr-engine";
import { DEFAULT_SETTINGS, type Settings } from "../types";

/**
 * Generate a QR code PNG for a URL or text with optional style settings.
 * Saves the file to ~/Downloads and returns the file path.
 */

interface Input {
  /** The URL, text, email address, phone number, or any other data to encode in the QR code. */
  url: string;
  /**
   * Shape of the individual QR data modules.
   * Options: square | circle | circle-large | diamond | circle-mixed | pacman | rounded | small-square | vertical-line
   */
  bodyPattern?: Settings["bodyPattern"];
  /**
   * Outer shape of the three corner finder squares.
   * Options: square | rounded | gear | circle | diya | extra-rounded | message | pointy | curly
   */
  cornerEyePattern?: Settings["cornerEyePattern"];
  /**
   * Inner dot shape inside each corner finder square.
   * Options: square | rounded | circle | diamond | message | diya | rounded-triangle | star | banner
   */
  cornerEyeDotPattern?: Settings["cornerEyeDotPattern"];
  /** Hex foreground color for the QR modules, e.g. "#000000". */
  fgColor?: string;
  /** Hex background color, e.g. "#ffffff". Transparent backgrounds are not supported. */
  bgColor?: string;
  /**
   * Decorative frame template drawn around the QR code.
   * Options: Arrow | StandardBox | SquareBorder | StrikedBox | Halloween
   */
  templateId?: string;
  /**
   * Error correction level. Use Q or H when adding a logo.
   * L = 7%, M = 15%, Q = 25%, H = 30% damage tolerance.
   */
  level?: Settings["level"];
  /** URL of a logo/image to place in the centre of the QR. Requires level Q or H. */
  logo?: string;
  /** Output size in pixels. Defaults to 512. Minimum 64. */
  size?: number;
}

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Save QR code for "${input.url}" to Downloads?`,
    info: [
      { name: "URL", value: input.url },
      ...(input.bodyPattern
        ? [{ name: "Body Pattern", value: input.bodyPattern }]
        : []),
      ...(input.cornerEyePattern
        ? [{ name: "Corner Eye", value: input.cornerEyePattern }]
        : []),
      ...(input.fgColor
        ? [{ name: "Foreground Color", value: input.fgColor }]
        : []),
      ...(input.bgColor
        ? [{ name: "Background Color", value: input.bgColor }]
        : []),
      ...(input.templateId
        ? [{ name: "Template", value: input.templateId }]
        : []),
      ...(input.level
        ? [{ name: "Error Correction", value: input.level }]
        : []),
      { name: "Size", value: `${input.size ?? 512}px` },
    ],
  };
};

export default function generateQR(input: Input): string {
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(input.bodyPattern ? { bodyPattern: input.bodyPattern } : {}),
    ...(input.cornerEyePattern
      ? { cornerEyePattern: input.cornerEyePattern }
      : {}),
    ...(input.cornerEyeDotPattern
      ? { cornerEyeDotPattern: input.cornerEyeDotPattern }
      : {}),
    ...(input.fgColor ? { fgColor: input.fgColor } : {}),
    ...(input.bgColor ? { bgColor: input.bgColor } : {}),
    ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
    ...(input.level ? { level: input.level } : {}),
    ...(input.logo ? { logo: input.logo } : {}),
    size: String(input.size ?? 512),
  };

  const qrProps = buildQRProps(input.url, settings);
  const buf = buildPNGBuffer(qrProps);
  const filename = `qrdx-${Date.now()}.png`;
  const outPath = join(homedir(), "Downloads", filename);
  writeFileSync(outPath, buf);

  return `QR code for "${input.url}" saved to ~/Downloads/${filename}`;
}
