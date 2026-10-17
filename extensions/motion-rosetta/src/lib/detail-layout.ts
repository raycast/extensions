import { crossings, springWindow, type Easing, type Output } from "./model.ts";
import { join } from "node:path";
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from "./preview-dimensions.ts";

export function previewMarkdown(
  curve: string,
  component: string,
  appearance: "dark" | "light",
  assets: string,
  gif?: string,
) {
  const poster = join(
    assets,
    `preview-${component.toLowerCase().replaceAll(" ", "-")}-${appearance}.png`,
  );
  // Local layout candidate: animation first; the full-size curve follows in scroll.
  // Only the component poster becomes its GIF. Both blocks stay in stable slots.
  return `![${component} preview](<${gif || poster}?raycast-width=${PREVIEW_WIDTH}&raycast-height=${PREVIEW_HEIGHT}>)\n\n${curve}`;
}

export function durationLabel(easing: Easing, seconds?: number) {
  seconds ??= easing.kind !== "spring" ? easing.duration : undefined;
  const time = (value: number) =>
    value > 0 && value < 0.01
      ? `${(value * 1000).toFixed(2)}ms`
      : `${value.toFixed(2)}s`;
  if (easing.kind !== "spring")
    return seconds === undefined
      ? "0.50s · assumed"
      : `${time(seconds)} · custom`;
  const window = springWindow(easing);
  return `${time(window.seconds)} · ${window.truncated ? "not settled" : "to settle"}`;
}
export function unavailableReason(output: Output, easing: Easing) {
  if (output.id === "css-bezier" && easing.kind === "spring") {
    return `No Bézier equivalent: ${crossings(easing, springWindow(easing).seconds)} crossings`;
  }
  return "No faithful equivalent in this format";
}
// Exactly one short line in every format. The complete snippet stays in Copy /
// View Full Conversion; a fixed line prevents wrapping and Unavailable jumps.
export function codePreview(output: Output, easing: Easing) {
  const text =
    output.code === undefined
      ? unavailableReason(output, easing)
      : output.code.replace(/\s+/g, " ").trim();
  const excerpt = text.length > 48 ? `${text.slice(0, 47)}…` : text;
  return `\n\n\`\`\`${output.code === undefined ? "text" : output.language}\n${excerpt}\n\`\`\``;
}
