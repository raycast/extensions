import { selectorsSchema } from "./tinyfish.ts";
import type { ExtractionPreset } from "./library-store";

export const BUILTIN_PRESETS: ExtractionPreset[] = [
  { id: "full", name: "Full Page", include: [], exclude: [] },
  {
    id: "article",
    name: "Article / Main Content",
    include: ["article", "main", '[role="main"]'],
    exclude: ["nav", "header", "footer", "aside"],
  },
  { id: "clean", name: "Remove Navigation and Footers", include: [], exclude: ["nav", "header", "footer", "aside"] },
];

export function parseSelectors(input: string) {
  const selectors = [
    ...new Set(
      input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
  return selectors.length ? selectorsSchema.parse(selectors) : undefined;
}
