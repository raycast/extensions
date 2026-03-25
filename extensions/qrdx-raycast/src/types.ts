import type {
  BodyPattern,
  CornerEyeDotPattern,
  CornerEyePattern,
  ErrorLevel,
} from "qrdx";

export interface Settings {
  bodyPattern: BodyPattern;
  cornerEyePattern: CornerEyePattern;
  cornerEyeDotPattern: CornerEyeDotPattern;
  fgColor: string;
  bgColor: string;
  eyeColor: string;
  dotColor: string;
  level: ErrorLevel;
  templateId: string;
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
  templateId: "",
  logo: "",
  size: "512",
  margin: "0",
};

export const BODY_PATTERNS: BodyPattern[] = [
  "square",
  "circle",
  "circle-large",
  "diamond",
  "circle-mixed",
  "pacman",
  "rounded",
  "small-square",
  "vertical-line",
];

export const CORNER_EYE_PATTERNS: CornerEyePattern[] = [
  "square",
  "rounded",
  "gear",
  "circle",
  "diya",
  "extra-rounded",
  "message",
  "pointy",
  "curly",
];

export const CORNER_DOT_PATTERNS: CornerEyeDotPattern[] = [
  "square",
  "rounded",
  "circle",
  "diamond",
  "message",
  "message-reverse",
  "diya",
  "diya-reverse",
  "rounded-triangle",
  "star",
  "banner",
];

export const ERROR_LEVELS: { value: ErrorLevel; label: string }[] = [
  { value: "L", label: "L — Low (7%)" },
  { value: "M", label: "M — Medium (15%)" },
  { value: "Q", label: "Q — Quartile (25%)" },
  { value: "H", label: "H — High (30%)" },
];

export const TEMPLATES: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "Arrow", label: "Arrow" },
  { value: "StandardBox", label: "Standard Box" },
  { value: "SquareBorder", label: "Square Border" },
  { value: "StrikedBox", label: "Striked Box" },
  { value: "Halloween", label: "Halloween" },
];

export function toLabel(val: string): string {
  if (!val) return "None";
  return val.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
