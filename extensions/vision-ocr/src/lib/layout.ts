/**
 * Turns Vision's loose text boxes into rows and paragraphs, so the copied text
 * reads like the image: same line order, paragraph breaks and (optionally) indentation.
 *
 * Everything here is pure and works on pixel coordinates with the origin at the top left.
 */

export type Box = { text: string; x: number; y: number; width: number; height: number };

export type Row = {
  text: string;
  /** Leading spaces that reproduce the row's indentation. */
  indent: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Estimated width of one character in this document, in pixels. */
  charWidth: number;
};

export type Paragraph = Row[];

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Boxes whose vertical centers sit within each other's height belong to the same row. */
function groupIntoRows(boxes: Box[]): Box[][] {
  // Compare against the typical text height, not each box's own height: a slightly tilted
  // line has a tall bounding box that would otherwise swallow the line below it.
  const textHeight = median(boxes.map((b) => b.height));
  const sorted = [...boxes].sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));
  const rows: Box[][] = [];
  for (const box of sorted) {
    const center = box.y + box.height / 2;
    const row = rows.find((candidate) => {
      const top = Math.min(...candidate.map((b) => b.y));
      const bottom = Math.max(...candidate.map((b) => b.y + b.height));
      const rowCenter = (top + bottom) / 2;
      return Math.abs(center - rowCenter) < textHeight / 2;
    });
    if (row) row.push(box);
    else rows.push([box]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

/** Width of one character, estimated from all boxes so a single odd box can't skew it. */
function characterWidth(boxes: Box[]) {
  const widths = boxes.filter((b) => b.text.trim().length >= 3).map((b) => b.width / b.text.length);
  return median(widths) || median(boxes.map((b) => b.height)) * 0.5 || 1;
}

export function buildRows(boxes: Box[], keepIndentation: boolean): Row[] {
  const usable = boxes.filter((b) => b.text.trim().length > 0);
  if (usable.length === 0) return [];
  const charWidth = characterWidth(usable);
  const rows = groupIntoRows(usable);
  const margin = Math.min(...usable.map((b) => b.x));

  return rows.map((row) => {
    const left = row[0].x;
    // Indentation under ~1.5 characters is jitter from the recognizer, not layout.
    const offset = (left - margin) / charWidth;
    const indent = keepIndentation && offset >= 1.5 ? Math.round(offset) : 0;
    return {
      text: row.map((b) => b.text.trim()).join(" "),
      indent,
      top: Math.min(...row.map((b) => b.y)),
      bottom: Math.max(...row.map((b) => b.y + b.height)),
      left,
      right: Math.max(...row.map((b) => b.x + b.width)),
      charWidth,
    };
  });
}

/**
 * Splits rows into paragraphs wherever the gap above a row is clearly larger than
 * the document's usual line spacing.
 */
export function buildParagraphs(rows: Row[]): Paragraph[] {
  if (rows.length === 0) return [];
  const heights = rows.map((r) => r.bottom - r.top);
  const lineHeight = median(heights);
  const gaps = rows.slice(1).map((row, i) => row.top - rows[i].bottom);
  // Typical spacing between lines of one paragraph: the lower quartile of all gaps, so a few
  // paragraph breaks don't inflate it and double-spaced text still counts as one paragraph.
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const usualGap = Math.max(sortedGaps[Math.floor((sortedGaps.length - 1) / 4)] ?? 0, 0);
  const breakAt = usualGap + Math.max(lineHeight * 0.6, 4);

  const paragraphs: Paragraph[] = [[rows[0]]];
  rows.slice(1).forEach((row, i) => {
    if (gaps[i] > breakAt) paragraphs.push([row]);
    else paragraphs[paragraphs.length - 1].push(row);
  });
  return paragraphs;
}
