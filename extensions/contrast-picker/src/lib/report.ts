import { RGB, toHex } from "./color";
import { ContrastReport, FixTarget, FontWeight, formatLc, formatRatio, requiredRatio, targetLabel } from "./contrast";
import { Fix, FixMode } from "./fixes";
import { previewImage } from "./preview";

export const MODE_LABEL: Record<FixMode, string> = {
  foreground: "text color",
  background: "background",
  both: "both colors",
};

export function fixTitle(fix: Fix): string {
  return `${targetLabel(fix.target)} · change ${MODE_LABEL[fix.mode]}`;
}

/** The color(s) that a fix changes, as the user would paste them. */
export function changedColors(fix: Fix): RGB[] {
  if (fix.mode === "foreground") return [fix.fg];
  if (fix.mode === "background") return [fix.bg];
  return [fix.fg, fix.bg];
}

type MarkdownInput = {
  fg: RGB;
  bg: RGB;
  report: ContrastReport;
  sizePx: number;
  weight: FontWeight;
  target: FixTarget;
  primary?: Fix;
  others: Fix[];
  notes: string[];
};

export function buildMarkdown({
  fg,
  bg,
  report,
  sizePx,
  weight,
  target,
  primary,
  others,
  notes,
}: MarkdownInput): string {
  const lines: string[] = [];

  lines.push(`### Original — \`${toHex(fg)}\` on \`${toHex(bg)}\``);
  lines.push(previewImage("Original", fg, bg, sizePx, weight));

  const passesTarget = target === "apca" ? report.apcaPass : report[target];
  if (passesTarget) {
    lines.push(`**✓ Passes ${targetLabel(target)}** at ${sizePx}px · ${weight}. No fix needed.`);
  } else if (primary) {
    lines.push(`### Suggested fix — \`${toHex(primary.fg)}\` on \`${toHex(primary.bg)}\``);
    lines.push(previewImage("Suggested fix", primary.fg, primary.bg, sizePx, weight));
    lines.push(
      `${fixTitle(primary)} → **${formatRatio(primary.ratio)}**, APCA Lc ${formatLc(primary.lc)}. Press **↵** to copy.`,
    );
  } else {
    lines.push(`**No fix found for ${targetLabel(target)}** at ${sizePx}px · ${weight}. Use a larger or bolder font.`);
  }

  lines.push(`### What this means`);
  lines.push(explain(report, sizePx, weight));

  if (others.length > 0) {
    lines.push(`### Other fixes`);
    lines.push(`| Fix | Text | Background | WCAG | APCA Lc |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const fix of others) {
      lines.push(
        `| ${fixTitle(fix)} | \`${toHex(fix.fg)}\` | \`${toHex(fix.bg)}\` | ${formatRatio(fix.ratio)} | ${formatLc(fix.lc)} |`,
      );
    }
    lines.push(`Open **Copy Other Fix** (⌘L) to copy one of them.`);
  }

  if (notes.length > 0) {
    lines.push(`---`);
    lines.push(notes.map((note) => `_${note}_`).join("\n\n"));
  }

  return lines.join("\n\n");
}

function explain(report: ContrastReport, sizePx: number, weight: FontWeight): string {
  const kind = report.large ? "large text" : "normal text";
  const rule = report.large
    ? "Large text is at least 24px, or at least 18.66px when bold (700+)."
    : "Text under 24px (or under 18.66px when not bold) counts as normal text.";
  const wcag = `At **${sizePx}px · ${weight}** this is **${kind}**. ${rule} WCAG 2.2 needs **${requiredRatio("aa", report.large)}:1** for AA and **${requiredRatio("aaa", report.large)}:1** for AAA. This pair has **${formatRatio(report.ratio)}**.`;

  const apca =
    report.apcaRequired === undefined
      ? `APCA: no contrast is enough for body text at ${sizePx}px · ${weight}. Use a larger or bolder font.`
      : `APCA needs **Lc ${report.apcaRequired}** for fluent text at this size and weight. This pair has **Lc ${formatLc(report.lc)}**.`;

  return `${wcag}\n\n${apca}`;
}

/** A short plain-text report for tickets, chats and pull requests. */
export function plainReport(fg: RGB, bg: RGB, report: ContrastReport, sizePx: number, weight: FontWeight, fix?: Fix) {
  const mark = (pass: boolean) => (pass ? "✓" : "✗");
  const lines = [
    `Contrast: ${toHex(fg)} on ${toHex(bg)} (${sizePx}px · ${weight})`,
    `WCAG 2.2: ${formatRatio(report.ratio)} — AA ${mark(report.aa)} · AAA ${mark(report.aaa)}`,
    `APCA: Lc ${formatLc(report.lc)} — ${mark(report.apcaPass)}`,
  ];
  if (fix) lines.push(`Fix (${fixTitle(fix)}): ${toHex(fix.fg)} on ${toHex(fix.bg)} — ${formatRatio(fix.ratio)}`);
  return lines.join("\n");
}
