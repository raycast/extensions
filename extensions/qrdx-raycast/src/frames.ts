// qrdx's call-to-action frames (a label such as "Scan me" around the code),
// straight from the installed qrdx, so an update brings its new frames along.
// Nothing in this extension names a frame: the list, names, search words and
// default colors all come from qrdx's BUILT_IN_FRAMES.

import {
  BUILT_IN_FRAMES,
  type BuiltInFrameStyle,
  DEFAULT_FRAME_TEXT,
  FRAME_TEXT_MAX_LENGTH,
  getBuiltInFrame,
  getFrameColors,
  type QRFrame,
} from "qrdx";

/** A built-in frame's style, or "" for no frame. */
export type FrameChoice = BuiltInFrameStyle | "";

/** No frame, then every built-in frame in the order qrdx's pickers list them. */
export const FRAME_CHOICES: FrameChoice[] = [
  "",
  ...BUILT_IN_FRAMES.map((frame) => frame.style),
];

/**
 * The frame a label or a frame color alone implies, as in qrdx's CLI: the
 * first frame qrdx lists.
 */
export const IMPLIED_FRAME: BuiltInFrameStyle = BUILT_IN_FRAMES[0].style;

/** A frame's name in pickers and tables ("None" for no frame). */
export function frameName(style: string | undefined): string {
  if (!style) return "None";
  return getBuiltInFrame(style)?.name ?? style;
}

/** Words a search finds a frame by besides its name: its style and tags. */
export function frameKeywords(style: string): string[] {
  const frame = getBuiltInFrame(style);
  return frame ? [frame.style, ...frame.tags] : [];
}

/** Every frame as "style (Name)", for the AI prompt and the AI tool's answers. */
export function describeFrames(): string {
  return BUILT_IN_FRAMES.map((frame) => `${frame.style} (${frame.name})`).join(
    ", "
  );
}

/**
 * The frame a style or a name stands for, in any case ("banner-bottom",
 * "Banner"): "" for no frame ("" or "none"), null for one qrdx doesn't have.
 */
export function resolveFrame(value: string | undefined): FrameChoice | null {
  const wanted = value?.trim().toLowerCase() ?? "";
  if (wanted === "" || wanted === "none") return "";
  const match = BUILT_IN_FRAMES.find(
    (frame) => frame.style === wanted || frame.name.toLowerCase() === wanted
  );
  return match ? match.style : null;
}

/** A label's length as qrdx counts it (characters, not UTF-16 units). */
export function frameTextLength(text: string): number {
  return Array.from(text).length;
}

/** `text` cut to the longest label a frame draws. */
export function capFrameText(text: string): string {
  return Array.from(text).slice(0, FRAME_TEXT_MAX_LENGTH).join("");
}

/** The colors a frame paints with when none are set: its frame and label. */
export function frameDefaultColors(
  style: string
): { frame: string; text: string } | null {
  const frame = getBuiltInFrame(style);
  return frame ? getFrameColors({ style: frame.style }) : null;
}

export interface FrameSettings {
  /** A built-in frame's style, or "" for none */
  frame?: string;
  /** The label; "" hides it, left out it is qrdx's default ("Scan me") */
  frameText?: string;
  /** Hex frame color; empty uses the frame's own */
  frameColor?: string;
  /** Hex label color; empty uses the frame's own */
  frameTextColor?: string;
}

/** The frame qrdx draws for these settings, or undefined for none. */
export function buildFrame(settings: FrameSettings): QRFrame | undefined {
  const style = resolveFrame(settings.frame);
  if (!style) return;
  const color = settings.frameColor?.trim();
  const textColor = settings.frameTextColor?.trim();
  return {
    style,
    text: settings.frameText ?? DEFAULT_FRAME_TEXT,
    ...(color ? { color } : {}),
    ...(textColor ? { textColor } : {}),
  };
}
