import type { Direction } from "../lib/format";
import { escapeXml } from "./svg";
import type { ChartTheme } from "./theme";

/**
 * A one-line change summary ("+CZK 70,116.70 · +11.3% all-time") with the change in Raycast's
 * green/red and the rest muted. Markdown can't colour text, so it's drawn into the headline image.
 */
export interface ChangeSegment {
  text: string;
  tone?: Direction;
}

/** The segments as <tspan>s: the change in green/red (semibold), the rest muted. */
export function changeSpans(segments: ChangeSegment[], theme: ChartTheme): string {
  return segments
    .map((seg) =>
      seg.tone
        ? `<tspan fill="${seg.tone === "up" ? theme.up : theme.down}" font-weight="600">${escapeXml(seg.text)}</tspan>`
        : `<tspan fill="${theme.mutedText}">${escapeXml(seg.text)}</tspan>`,
    )
    .join("");
}
