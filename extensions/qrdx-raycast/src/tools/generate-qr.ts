import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Tool } from "@raycast/api";
import { FRAME_TEXT_MAX_LENGTH } from "qrdx";
import { describeFrames, type FrameChoice, frameName, frameTextLength, IMPLIED_FRAME, resolveFrame } from "../frames";
import { buildPNGBuffer, buildQRProps, withLogoData } from "../qr-engine";
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
   * Options: square | circle | circle-large | diamond | circle-mixed | pacman | rounded | small-square | vertical-line | horizontal-line | liquid | liquid-horizontal | liquid-vertical | classy | classy-rounded | leaf | plus | hexagon | star | heart | random-dots | mosaic | octagon
   */
  bodyPattern?: Settings["bodyPattern"];
  /**
   * Outer shape of the three corner finder squares.
   * Options: square | rounded | gear | circle | diya | extra-rounded | message | pointy | leaf | drop | octagon | bevel | squircle | cushion | shield | petal | leaf-reverse | porthole | notch | plus | bud | bowl
   */
  cornerEyePattern?: Settings["cornerEyePattern"];
  /**
   * Inner dot shape inside each corner finder square.
   * Options: square | rounded | circle | message | message-reverse | diya | diya-reverse | rounded-triangle | leaf | drop | plus | cross-rounded | hexagon | octagon | flower | heart | squircle | dots | extra-rounded | leaf-reverse | drop-reverse | cushion
   */
  cornerEyeDotPattern?: Settings["cornerEyeDotPattern"];
  /** Hex foreground color for the QR modules, e.g. "#000000". */
  fgColor?: string;
  /** Hex background color, e.g. "#ffffff". Transparent backgrounds are not supported. */
  bgColor?: string;
  /**
   * A call-to-action frame drawn around the code, by its style name, such as
   * a bottom banner or a speech bubble. Leave it out for no frame. An unknown
   * name gets the list of valid names back, so call again with one of them.
   */
  frame?: string;
  /**
   * The frame's label, such as "Scan me" (the default) or "Scan for the
   * menu". Keep it short: a label that's too long gets the limit back. An
   * empty string draws the frame without a label. A label without a frame
   * gets the first frame.
   */
  frameText?: string;
  /** Hex color of the frame, e.g. "#000000". Defaults to the frame's own. */
  frameColor?: string;
  /** Hex color of the frame's label, e.g. "#ffffff". Defaults to the frame's own. */
  frameTextColor?: string;
  /**
   * Error correction level. Use Q or H when adding a logo.
   * L = 7%, M = 15%, Q = 25%, H = 30% damage tolerance.
   */
  level?: Settings["level"];
  /** URL of a logo/image to place in the center of the QR. Requires level Q or H. */
  logo?: string;
  /** Output size in pixels. Defaults to 512. Minimum 64. */
  size?: number;
}

/**
 * The frame the input asks for ("" for none), or why it can't be drawn. A
 * label or frame color without a frame implies one, as in qrdx's CLI.
 */
function frameOf(input: Input): { frame: FrameChoice; error?: undefined } | { frame?: undefined; error: string } {
  const frame = resolveFrame(input.frame);
  if (frame === null) {
    return {
      error: `QRdx has no frame called "${input.frame}". The frames are: ${describeFrames()}. Call generate-qr again with one of these styles, or without a frame.`,
    };
  }
  if (input.frameText !== undefined && frameTextLength(input.frameText) > FRAME_TEXT_MAX_LENGTH) {
    return {
      error: `The frame label "${input.frameText}" is too long: use ${FRAME_TEXT_MAX_LENGTH} characters or fewer.`,
    };
  }
  const implied = input.frameText || input.frameColor || input.frameTextColor ? IMPLIED_FRAME : "";
  return { frame: frame || implied };
}

export const confirmation: Tool.Confirmation<Input> = (input) => {
  const { frame, error } = frameOf(input);
  // Nothing is saved: the tool answers with what to fix.
  if (error !== undefined) return Promise.resolve(undefined);
  return Promise.resolve({
    message: `Save QR code for "${input.url}" to Downloads?`,
    info: [
      { name: "URL", value: input.url },
      ...(input.bodyPattern ? [{ name: "Body Pattern", value: input.bodyPattern }] : []),
      ...(input.cornerEyePattern ? [{ name: "Corner Eye", value: input.cornerEyePattern }] : []),
      ...(input.fgColor ? [{ name: "Foreground Color", value: input.fgColor }] : []),
      ...(input.bgColor ? [{ name: "Background Color", value: input.bgColor }] : []),
      ...(frame ? [{ name: "Frame", value: frameName(frame) }] : []),
      ...(frame && input.frameText !== undefined ? [{ name: "Frame Label", value: input.frameText || "None" }] : []),
      ...(input.level ? [{ name: "Error Correction", value: input.level }] : []),
      { name: "Size", value: `${input.size ?? 512}px` },
    ],
  });
};

export default async function generateQR(input: Input): Promise<string> {
  const checked = frameOf(input);
  if (checked.error !== undefined) return checked.error;
  const { frame } = checked;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(input.bodyPattern ? { bodyPattern: input.bodyPattern } : {}),
    ...(input.cornerEyePattern ? { cornerEyePattern: input.cornerEyePattern } : {}),
    ...(input.cornerEyeDotPattern ? { cornerEyeDotPattern: input.cornerEyeDotPattern } : {}),
    ...(input.fgColor ? { fgColor: input.fgColor } : {}),
    ...(input.bgColor ? { bgColor: input.bgColor } : {}),
    frame,
    ...(frame && input.frameText !== undefined ? { frameText: input.frameText } : {}),
    ...(frame && input.frameColor ? { frameColor: input.frameColor } : {}),
    ...(frame && input.frameTextColor ? { frameTextColor: input.frameTextColor } : {}),
    ...(input.level ? { level: input.level } : {}),
    ...(input.logo ? { logo: input.logo } : {}),
    size: String(input.size ?? 512),
  };

  const qrProps = buildQRProps(input.url, settings);
  // A logo given by its address is loaded first; one that can't be loaded throws, saying why.
  const buf = buildPNGBuffer(await withLogoData(qrProps));
  const filename = `qrdx-${Date.now()}.png`;
  const outPath = join(homedir(), "Downloads", filename);
  writeFileSync(outPath, buf);

  return `QR code for "${input.url}" saved to ~/Downloads/${filename}`;
}
