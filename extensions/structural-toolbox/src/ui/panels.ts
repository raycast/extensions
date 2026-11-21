import { DETAIL_WIDTH, palette, readableFont, smallFont, svgLabel, wrapLabel } from "./visual-style";
export interface MetricCard {
  title: string;
  value: string;
  note?: string;
  accent?: boolean;
  valueSize?: number;
}
export function metricCards(metrics: MetricCard[], width = DETAIL_WIDTH, font = readableFont(), columns = 2) {
  const c = palette(),
    gap = 12,
    n = Math.max(1, Math.min(columns, metrics.length)),
    cell = (width - gap * (n - 1)) / n,
    small = smallFont(font);
  let body = "",
    top = 0;
  for (let start = 0; start < metrics.length; start += n) {
    const group = metrics.slice(start, start + n),
      single = group.length === 1 && n === 2;
    const layouts = group.map((m) => {
      const w = single ? width : cell,
        size = m.valueSize || Math.max(28, font + 10);
      const title = wrapLabel(m.title, w - 28, font),
        value = wrapLabel(m.value, w - 28, size),
        notes = m.note ? wrapLabel(m.note, w - 28, small) : [];
      const valueY = 14 + title.length * (font + 5) + size,
        noteY = valueY + (value.length - 1) * (size + 6) + small + 10;
      return {
        m,
        w,
        size,
        title,
        value,
        notes,
        valueY,
        noteY,
        h: notes.length ? noteY + (notes.length - 1) * (small + 6) + 16 : valueY + (value.length - 1) * (size + 6) + 18,
      };
    });
    const height = Math.max(...layouts.map((l) => l.h));
    layouts.forEach((l, j) => {
      const x = j * (cell + gap);
      body += `<rect x="${x}" y="${top}" width="${l.w}" height="${height}" rx="12" fill="${l.m.accent ? c.accent : c.bg}" stroke="${c.border}"/>`;
      l.title.forEach((s, i) => (body += svgLabel(x + 14, top + 14 + font + i * (font + 5), s, font, c.sub)));
      l.value.forEach((s, i) => (body += svgLabel(x + 14, top + l.valueY + i * (l.size + 6), s, l.size, c.ink, 500)));
      l.notes.forEach((s, i) => (body += svgLabel(x + 14, top + l.noteY + i * (small + 6), s, small, c.sub)));
    });
    top += height + gap;
  }
  return { body, height: top };
}
export function parameterChips(values: string[], width = DETAIL_WIDTH, font = readableFont()) {
  const c = palette(),
    size = smallFont(font),
    gap = 9;
  let x = 0,
    y = 0,
    body = "",
    height = size + 20;
  for (const value of values) {
    const w = Math.min(width, Math.ceil(value.length * size * 0.56 + 24));
    if (x + w > width) {
      x = 0;
      y += height + gap;
    }
    const lines = wrapLabel(value, w - 20, size),
      h = lines.length * (size + 5) + 12;
    body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${c.soft}" stroke="${c.border}"/>`;
    lines.forEach((s, i) => (body += svgLabel(x + 11, y + size + 5 + i * (size + 5), s, size, c.sub)));
    x += w + gap;
    height = Math.max(height, h);
  }
  return { body, height: values.length ? y + height + 12 : 0 };
}
