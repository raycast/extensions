import { surfaces, type Options } from "./settings";

export type Dimension = "theme" | "surface" | "width" | "dpr" | "expanded";

export function variantOptions(options: Options, dimension: Dimension): Options[] {
  const values = {
    theme: ["light", "dark"],
    surface: Object.keys(surfaces),
    width: [320, 390, 600],
    dpr: [1, 2, 3],
    expanded: [false, true],
  };
  if (!Object.hasOwn(values, dimension)) throw new Error("Choose theme, surface, width, dpr, or expanded.");
  return values[dimension].map((value) => ({ ...options, [dimension]: value }));
}
