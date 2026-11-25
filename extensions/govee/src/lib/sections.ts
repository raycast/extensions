export const SECTIONS = ["devices", "scenarios", "snapshots", "music"] as const;
export type SectionKey = (typeof SECTIONS)[number];

/**
 * Sections to show, in order, from one position setting per section ("1"–"4" or "hidden").
 * A section can only appear once; sections sharing a position keep the default order.
 */
export const sectionOrder = (positions: Partial<Record<SectionKey, string>>): SectionKey[] =>
  SECTIONS.map((key, i) => ({ key, pos: positions[key] ?? String(i + 1), i }))
    .filter(({ pos }) => pos !== "hidden")
    .sort((a, b) => Number(a.pos) - Number(b.pos) || a.i - b.i)
    .map(({ key }) => key);
