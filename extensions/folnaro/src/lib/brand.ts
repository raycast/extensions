import type { StatusTone } from "./format";

/**
 * Brand colors from docs/brand/tokens.json (version 2.1 "Quiet Glass / Luminous Teal"), light and
 * dark appearance. `test/brand.test.ts` compares them with the token file, so a palette change
 * there fails until this copy follows. Color never carries meaning alone: every status also has text.
 */
export interface ThemedColor {
  light: string;
  dark: string;
  adjustContrast?: boolean;
}

export const BRAND_ACCENT: ThemedColor = { light: "#006E7A", dark: "#72DED9" };

/** Primitives the status aliases point at (`aliases.status…` in tokens.json). */
export const PALETTE: Record<"neutral" | "blue" | "cyan" | "amber" | "green" | "red" | "violet", ThemedColor> = {
  neutral: { light: "#545F68", dark: "#ABB8C0" },
  blue: { light: "#245EA0", dark: "#91BDF4" },
  cyan: { light: "#00666F", dark: "#7FD0CF" },
  amber: { light: "#9E5400", dark: "#E2C166" },
  green: { light: "#276344", dark: "#88D3A7" },
  red: { light: "#AA3347", dark: "#FF9AA8" },
  violet: { light: "#6D5192", dark: "#C9AFF0" },
};

/** `statusDraft` … `statusDeclined` of tokens.json. */
export const STATUS_PRIMITIVE: Record<StatusTone, keyof typeof PALETTE> = {
  draft: "neutral",
  open: "blue",
  sent: "cyan",
  partiallyPaid: "amber",
  paid: "green",
  overdue: "red",
  cancelled: "neutral",
  accepted: "green",
  declined: "violet",
};

export function statusColor(tone: StatusTone): ThemedColor {
  return { ...PALETTE[STATUS_PRIMITIVE[tone]], adjustContrast: false };
}
