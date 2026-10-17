export const dictationPositions = [
  { value: "top-left", title: "Top Left" },
  { value: "top-center", title: "Top Center" },
  { value: "top-right", title: "Top Right" },
  { value: "center-left", title: "Center Left" },
  { value: "center", title: "Center" },
  { value: "center-right", title: "Center Right" },
  { value: "bottom-left", title: "Bottom Left" },
  { value: "bottom-center", title: "Bottom Center" },
  { value: "bottom-right", title: "Bottom Right" },
] as const;

export type DictationPosition = (typeof dictationPositions)[number]["value"];

export type DictationAppearance = {
  position: DictationPosition;
  offsetX: number;
  offsetY: number;
};

export const defaultDictationAppearance: DictationAppearance = {
  position: "bottom-right",
  offsetX: 0,
  offsetY: 0,
};

export function parseDictationOffset(value: string): number | undefined {
  const offset = Number(value.trim());
  return Number.isFinite(offset) && Math.abs(offset) <= 10_000
    ? offset
    : undefined;
}

export function normalizeDictationAppearance(
  value: unknown,
): DictationAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ...defaultDictationAppearance };
  const stored = value as Partial<DictationAppearance>;
  return {
    position: dictationPositions.some(({ value }) => value === stored.position)
      ? (stored.position as DictationPosition)
      : defaultDictationAppearance.position,
    offsetX:
      typeof stored.offsetX === "number" &&
      Number.isFinite(stored.offsetX) &&
      Math.abs(stored.offsetX) <= 10_000
        ? stored.offsetX
        : 0,
    offsetY:
      typeof stored.offsetY === "number" &&
      Number.isFinite(stored.offsetY) &&
      Math.abs(stored.offsetY) <= 10_000
        ? stored.offsetY
        : 0,
  };
}

export function parseDictationAppearance(value?: string): DictationAppearance {
  try {
    return normalizeDictationAppearance(value ? JSON.parse(value) : undefined);
  } catch {
    return { ...defaultDictationAppearance };
  }
}

// Keep this self-contained so the native script uses the same placement rules.
export function dictationPanelOrigin(
  screen: { x: number; y: number; width: number; height: number },
  panel: { width: number; height: number },
  appearance: DictationAppearance,
): { x: number; y: number } {
  const insetX = Math.min(12, Math.max(0, (screen.width - panel.width) / 2));
  const insetY = Math.min(12, Math.max(0, (screen.height - panel.height) / 2));
  const minX = screen.x + insetX;
  const minY = screen.y + insetY;
  const maxX = Math.max(minX, screen.x + screen.width - panel.width - insetX);
  const maxY = Math.max(minY, screen.y + screen.height - panel.height - insetY);
  const horizontal = appearance.position.endsWith("-left")
    ? 0
    : appearance.position.endsWith("-right")
      ? 1
      : 0.5;
  const vertical = appearance.position.startsWith("top-")
    ? 1
    : appearance.position.startsWith("bottom-")
      ? 0
      : 0.5;
  return {
    x: Math.max(
      minX,
      Math.min(maxX, minX + (maxX - minX) * horizontal + appearance.offsetX),
    ),
    y: Math.max(
      minY,
      Math.min(maxY, minY + (maxY - minY) * vertical - appearance.offsetY),
    ),
  };
}
