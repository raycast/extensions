import { Collection, filterLibrary, readLibrary } from "../lib/library";

type Input = {
  /** Collection to browse: history (most recent first), favorites, or templates (including built-in styles). */
  collection: Collection;
  /** Optional name or icon keywords. Omit to list recent entries. */
  query?: string;
  /** Maximum results, from 1 to 50. Defaults to 20. */
  limit?: number;
};

export default function tool(input: Input) {
  if (!["history", "favorites", "templates"].includes(input.collection))
    throw new Error("Choose history, favorites, or templates");
  const library = readLibrary();
  const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 20) || 20));
  const matches = filterLibrary(library[input.collection], input.query ?? "");
  return {
    items: matches.slice(0, limit).map((item) => ({
      id: item.id,
      collection: input.collection,
      name: item.name,
      icon: item.settings.customSvg ? "custom SVG" : item.settings.icon,
      fill: item.settings.backgroundFillType,
      colors: [item.settings.backgroundStartColor, item.settings.backgroundEndColor],
      builtIn: item.builtIn ?? false,
      updatedAt: item.updatedAt,
    })),
    total: matches.length,
    warnings: library.issues,
  };
}
