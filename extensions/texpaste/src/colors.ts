export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Dark Gray", hex: "#3A3A3C" },
  { name: "Gray", hex: "#8E8E93" },
  { name: "Blue", hex: "#1A4FD0" },
  { name: "Red", hex: "#D02A2A" },
  { name: "Green", hex: "#1E8E3E" },
  { name: "Orange", hex: "#E8710A" },
  { name: "Purple", hex: "#7B3FD0" },
];

export function normalizeColor(c?: string | null): string | null {
  const s = (c || "").trim();
  if (/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(s)) return (s.startsWith("#") ? s : `#${s}`).toUpperCase();
  return null;
}

export function isDark(color: string): boolean {
  let h = color.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

export function colorName(hex: string): string {
  return COLOR_PRESETS.find((p) => p.hex === hex)?.name ?? hex;
}

/** Saves the equation color and remembers custom (non-preset) colors for the ⌘T menu. */
export async function saveColor(
  storage: {
    getItem<T extends string>(k: string): Promise<T | undefined>;
    setItem(k: string, v: string): Promise<void>;
  },
  hex: string,
): Promise<string[]> {
  await storage.setItem("colorOverride", hex);
  const raw = await storage.getItem<string>("customColors");
  const customs: string[] = raw ? JSON.parse(raw) : [];
  if (COLOR_PRESETS.some((p) => p.hex === hex) || customs.includes(hex)) return customs;
  const list = [hex, ...customs].slice(0, 8);
  await storage.setItem("customColors", JSON.stringify(list));
  return list;
}
