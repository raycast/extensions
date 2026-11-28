import type { BodyPattern, CornerEyeDotPattern, CornerEyePattern, ErrorLevel } from "qrdx";
import {
  BODY_PATTERN,
  CORNER_EYE_DOT_PATTERNS,
  DEFAULT_FRAME_TEXT,
  getTemplate,
  CORNER_EYE_PATTERNS as QRDX_CORNER_EYE_PATTERNS,
} from "qrdx";
import type { FrameChoice } from "./frames";

export interface Settings {
  bodyPattern: BodyPattern;
  cornerEyePattern: CornerEyePattern;
  cornerEyeDotPattern: CornerEyeDotPattern;
  fgColor: string;
  bgColor: string;
  eyeColor: string;
  dotColor: string;
  level: ErrorLevel;
  /** A built-in frame's style (see ./frames), or "" for none */
  frame: FrameChoice;
  /** The frame's label; "" hides it */
  frameText: string;
  /** Hex frame color; "" uses the frame's own */
  frameColor: string;
  /** Hex label color; "" uses the frame's own */
  frameTextColor: string;
  /**
   * A decorative template, on codes saved before frames replaced templates.
   * It's still drawn, so those codes look as they did, but nothing offers
   * templates any more, and choosing a frame replaces it.
   */
  templateId?: string;
  logo: string;
  size: string;
  margin: string;
}

export const DEFAULT_SETTINGS: Settings = {
  bodyPattern: "square",
  cornerEyePattern: "square",
  cornerEyeDotPattern: "square",
  fgColor: "#000000",
  bgColor: "#ffffff",
  eyeColor: "",
  dotColor: "",
  level: "Q",
  frame: "",
  frameText: DEFAULT_FRAME_TEXT,
  frameColor: "",
  frameTextColor: "",
  logo: "",
  size: "512",
  margin: "0",
};

/** `first`, then the rest of `list` in qrdx's order. */
function startWith<T>(first: T, list: readonly T[]): T[] {
  return [first, ...list.filter((item) => item !== first)];
}

// The shapes qrdx offers, straight from the installed version, so a qrdx
// update brings its new shapes with it. Each one decodes with jsQR and ZXing
// in qrdx's own tests. Retired shapes (curly eyes; diamond, star and banner
// centres) aren't in these lists; qrdx still draws them for saved designs.
export const BODY_PATTERNS: BodyPattern[] = startWith<BodyPattern>("square", BODY_PATTERN);

export const CORNER_EYE_PATTERNS: CornerEyePattern[] = startWith<CornerEyePattern>("square", QRDX_CORNER_EYE_PATTERNS);

export const CORNER_DOT_PATTERNS: CornerEyeDotPattern[] = startWith<CornerEyeDotPattern>(
  "square",
  CORNER_EYE_DOT_PATTERNS
);

/** Whether an eye frame's name is also an eye centre (`circle`, `leaf`, …). */
export function isCornerDotPattern(name: string): name is CornerEyeDotPattern {
  return (CORNER_DOT_PATTERNS as string[]).includes(name);
}

export const ERROR_LEVELS: { value: ErrorLevel; label: string }[] = [
  { value: "L", label: "L — Low (7%)" },
  { value: "M", label: "M — Medium (15%)" },
  { value: "Q", label: "Q — Quartile (25%)" },
  { value: "H", label: "H — High (30%)" },
];

/** A saved code's template by its name in qrdx ("StandardBox" → "Standard Box"). */
export function templateName(id: string): string {
  return getTemplate(id)?.name ?? id;
}

export function toLabel(val: string): string {
  if (!val) return "None";
  return val.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
