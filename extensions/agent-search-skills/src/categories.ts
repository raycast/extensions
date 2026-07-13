import { Color } from "@raycast/api";
import { readFile } from "fs/promises";
import { join } from "path";
import { Skill } from "./skills";

export const TAXONOMY = [
  "Design",
  "Animation & Motion",
  "Engineering",
  "iOS & macOS",
  "Marketing & SEO",
  "Copywriting",
  "QA & Review",
  "Deploy & Infra",
  "Workflow & Process",
  "AI & Memory",
] as const;

export type Category = (typeof TAXONOMY)[number];

export const CATEGORY_COLORS: Record<Category, Color> = {
  Design: Color.Magenta,
  "Animation & Motion": Color.Purple,
  Engineering: Color.Blue,
  "iOS & macOS": Color.PrimaryText,
  "Marketing & SEO": Color.Orange,
  Copywriting: Color.Yellow,
  "QA & Review": Color.Red,
  "Deploy & Infra": Color.Green,
  "Workflow & Process": Color.SecondaryText,
  "AI & Memory": Color.Blue,
};

export type CategoryMap = Record<string, Category[]>;

const TAXONOMY_SET = new Set<string>(TAXONOMY);

async function readCategoryFile(path: string): Promise<CategoryMap> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8"));
    const map: CategoryMap = {};
    if (raw && typeof raw === "object") {
      for (const [name, value] of Object.entries(raw)) {
        if (!Array.isArray(value)) continue;
        const cats = [
          ...new Set(value.filter((cat): cat is Category => typeof cat === "string" && TAXONOMY_SET.has(cat))),
        ];
        if (cats.length > 0) map[name] = cats.slice(0, 3);
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * The bundled assets/categories.json maps publicly installable skills (packs,
 * marketplace plugins). A user-generated categories.json in the extension's
 * support directory (see scripts/regenerate-categories.sh) covers personal
 * skills and overrides the bundle per entry.
 */
export async function loadCategoryMap(assetsPath: string, supportPath: string): Promise<CategoryMap> {
  const [bundled, local] = await Promise.all([
    readCategoryFile(join(assetsPath, "categories.json")),
    readCategoryFile(join(supportPath, "categories.json")),
  ]);
  return { ...bundled, ...local };
}

// Skills installed after the last regeneration get a best-guess primary
// category from their name and description. First matching rule wins.
const FALLBACK_RULES: Array<[RegExp, Category]> = [
  [/\b(ios|macos|swiftui|swift|xcode|expo)\b/, "iOS & macOS"],
  [/\b(animations?|animated?|motion|gsap|transitions?|easings?)\b/, "Animation & Motion"],
  [/\b(seo|marketing|cro|conversions?|ads?|paywalls?|pricing)\b/, "Marketing & SEO"],
  [/\b(copy|copywriting|articles?|humanize|writing)\b/, "Copywriting"],
  [/\b(deploy(ment|s|ing)?|cloudflare|wrangler|infra(structure)?|ship(ping)?|canary)\b/, "Deploy & Infra"],
  [/\b(reviews?|reviewing|audits?|auditing|qa|test(s|ing)?|lint(ing|er)?|accessibility)\b/, "QA & Review"],
  [/\b(design|ui|ux|typography|colors?|fonts?|figma)\b/, "Design"],
  [/\b(memory|mcp|agents?|codex|claude|llm|prompts?)\b/, "AI & Memory"],
  [
    /\b(react|typescript|javascript|css|apis?|databases?|refactor(ing)?|frameworks?|components?|frontend|backend)\b/,
    "Engineering",
  ],
  [/\b(plans?|planning|workflows?|sessions?|commits?|git|kickoff|orchestrat(e|ion|or)s?)\b/, "Workflow & Process"],
];

export function categoriesFor(skill: Skill, map: CategoryMap): Category[] {
  const mapped = map[skill.name];
  if (mapped) return mapped;
  const haystack = `${skill.name} ${skill.description}`.toLowerCase();
  for (const [pattern, category] of FALLBACK_RULES) {
    if (pattern.test(haystack)) return [category];
  }
  return [];
}
