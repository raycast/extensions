import { PICKER_COLUMNS } from "./calendar";
import { DARK, group, IMAGE_HEIGHT, IMAGE_WIDTH, LIGHT, round, svgDocument, text, title, TITLE_HEIGHT } from "./svg";

const PICKER_ROWS = 3;

export interface PickerCell {
  label: string;
  isSelected: boolean;
  /** The cell containing today, outlined like today in the day calendar. */
  isCurrent: boolean;
  /** Cells outside the page (e.g. the years around a decade) are drawn faded. */
  isOutside: boolean;
}

export function renderPickerSvg(heading: string, cells: PickerCell[], dark: boolean): string {
  const palette = dark ? DARK : LIGHT;
  const cellWidth = IMAGE_WIDTH / PICKER_COLUMNS;
  const cellHeight = (IMAGE_HEIGHT - TITLE_HEIGHT) / PICKER_ROWS;
  const parts = [title(heading, palette)];

  const labels: string[] = [];
  cells.forEach((cell, index) => {
    const x = (index % PICKER_COLUMNS) * cellWidth;
    const y = TITLE_HEIGHT + Math.floor(index / PICKER_COLUMNS) * cellHeight;
    const cx = x + cellWidth / 2;
    const cy = y + cellHeight / 2;

    if (cell.isSelected) {
      parts.push(
        `<rect x="${round(x + 6)}" y="${round(y + 6)}" width="${round(cellWidth - 12)}" height="${round(cellHeight - 12)}" rx="10" fill="${palette.selection}"/>`,
      );
    }
    const ring = cell.isCurrent
      ? `<rect x="${round(cx - 52)}" y="${round(cy - 22)}" width="104" height="44" rx="22" fill="none" stroke="${palette.todayRing}" stroke-width="2.5"/>`
      : "";
    const label = ring + text(cx, cy + 1, cell.label, cell.isCurrent ? `font-weight="700"` : "");
    labels.push(cell.isOutside ? `<g opacity="0.3">${label}</g>` : label);
  });
  parts.push(group(`font-size="22" font-weight="500" fill="${palette.text}"`, labels));

  return svgDocument(parts);
}
