import { TimeFormat, jsToBufferDay, reformatTimesInProse } from "./compute";
import { DAY_NAMES, Intensity, Platform } from "./heatmaps";

/** Hours shown in the heatmap (6 a.m. → 10 p.m. local). */
const VISIBLE_HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

/**
 * Render a platform's weekly heatmap as a markdown string for Raycast's
 * `<Detail>` view. The layout is a `<pre>` block of Unicode block characters:
 * days run across as columns, hours run down as rows.
 *
 *   intensity 0–1 (poor / ok)  →  "    "  empty (not actionable)
 *   intensity 2   (good)       →  ░░░░   LIGHT SHADE × 4 (U+2591)
 *   intensity 3   (best)       →  ████   FULL BLOCK  × 4 (U+2588)
 *
 * Why a `<pre>` block instead of a table: every HTML-table approach we tried
 * fought Raycast's markdown sanitiser on something (row heights, cell
 * alignment, color). Monospace `<pre>` text handles alignment, row height
 * and theme adaptation all in a single primitive that the renderer leaves
 * alone. Good/best contrast comes from shade rather than color, so the
 * chart adapts to light/dark automatically.
 *
 * Each day-column is 6 chars wide: header " Mon  " / data " ████ ". Hour
 * labels sit in a 3-char left gutter with a separator space. Today's
 * day-name and the current hour's label are wrapped in <b>; the user reads
 * "now" as the intersection of a bold column and a bold row.
 */
export function renderHeatmapMarkdown(
  platform: Platform,
  now: Date,
  timeFormat: TimeFormat,
): string {
  const nowDay = jsToBufferDay(now.getDay());
  const nowHour = now.getHours();

  const cell = (v: Intensity): string => {
    if (v === 3) return " ████ ";
    if (v === 2) return " ░░░░ ";
    return "      ";
  };

  const labelForHour = (h: number): string => {
    if (timeFormat === "24h") return " " + String(h).padStart(2, "0");
    const ap = h < 12 ? "a" : "p";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return String(hh).padStart(2, " ") + ap;
  };

  // Header row: 4-char left gutter, then 7 day-name cells each 6 chars wide.
  const dayHeaderLine =
    "    " +
    DAY_NAMES.map((name, d) => {
      const display = d === nowDay ? `<b>${name}</b>` : name;
      return " " + display + "  "; // 6 visible chars: 1 + 3 + 2
    }).join("");

  // One line per visible hour: " 06 [cells]".
  const hourLines = VISIBLE_HOURS.map((h) => {
    const labelText = labelForHour(h);
    const label = h === nowHour ? `<b>${labelText}</b>` : labelText;
    const cells = DAY_NAMES.map((_, d) => cell(platform.heatmap[d][h])).join(
      "",
    );
    return `${label} ${cells}`;
  });

  const heatmap =
    `<pre style="` +
    `font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;` +
    `font-size:13px;line-height:1.55;letter-spacing:0;` +
    `margin:12px 0 0 0;padding:0;background:transparent;border:0;` +
    `white-space:pre;` +
    `">` +
    [dayHeaderLine, ...hourLines].join("\n") +
    `</pre>`;

  const heading =
    `<h2 style="margin:0 0 4px 0;font-size:20px;font-weight:700;line-height:1.1;">${platform.name}</h2>` +
    `<p style="margin:0 0 6px 0;font-size:12px;color:#888;line-height:1.3;">${reformatTimesInProse(
      platform.notes,
      timeFormat,
    )}</p>`;

  return [heading, heatmap].join("\n");
}
