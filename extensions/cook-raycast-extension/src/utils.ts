/**
 * UTILS — The toolbox that every command in this extension depends on.
 *
 * What's in here:
 *   1. getPreferences()          — read user settings from Raycast
 *   2. runCook(args)             — call the CookCLI .exe without a shell
 *   3. listRecipes(dir)          — list .cook/.menu files using Node's filesystem
 *   4. formatQuantity(qty)       — turn {value: 6, unit: "balls"} into "6 balls"
 *   5. recipeToMarkdown(data)    — turn CookCLI JSON into pretty markdown
 *
 * KEY CONCEPT: execFile vs execSync
 *   execSync runs through a shell (cmd.exe on Windows). The shell interprets
 *   backslashes in paths as escape characters, mangling things like
 *   "C:\Users\spiri\..." into garbage. execFile skips the shell entirely —
 *   it launches the .exe directly with the arguments as an array. No escaping
 *   issues, no mangling.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
import { existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { pathToFileURL } from "url";
import { getPreferenceValues } from "@raycast/api";

/** Read the extension preferences Raycast stores. Returns an object with all three fields. */
export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Auto-detect the cook CLI path. Checks common locations, falls back to preference default. */
export function resolveCookPath(): string {
  const { cookCliPath } = getPreferences();

  // If the preference points to a valid executable, use it
  if (
    cookCliPath &&
    existsSync(cookCliPath) &&
    !statSync(cookCliPath).isDirectory()
  )
    return cookCliPath;

  // If preference is a directory, look for cook binary inside it
  if (
    cookCliPath &&
    existsSync(cookCliPath) &&
    statSync(cookCliPath).isDirectory()
  ) {
    const isWin = process.platform === "win32";
    const exePath = join(cookCliPath, isWin ? "cook.exe" : "cook");
    if (existsSync(exePath)) return exePath;
  }

  // Common locations by platform
  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [
        join(process.env.LOCALAPPDATA || "", "cook", "cook.exe"),
        "C:\\Program Files\\cook\\cook.exe",
      ]
    : [
        "/opt/homebrew/bin/cook", // macOS Apple Silicon Homebrew
        "/usr/local/bin/cook", // macOS Intel Homebrew
        "/home/linuxbrew/.linuxbrew/bin/cook", // Linux Homebrew
        "/usr/bin/cook", // Linux system
        join(process.env.HOME || "~", ".cargo/bin/cook"), // cargo install
      ];

  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }

  // Fall back to whatever's configured, even if broken
  return cookCliPath;
}

/** Check that the recipe folder actually exists on disk. */
export function validateRecipePath(): boolean {
  return existsSync(getPreferences().recipePath);
}

// ── COOK CLI RUNNER — talk to cook.exe safely ──

/**
 * Run a CookCLI command and return its stdout as a trimmed string.
 *
 * FUNCTION runCook(args):
 *   path = user's cook.exe location
 *   folder = user's recipe folder
 *
 *   TRY:
 *     // execFile: launch the .exe directly, NO shell (async — does not block UI)
 *     // args = ["recipe", "pizza.cook", "-f", "json"]
 *     // becomes: cook.exe recipe pizza.cook -f json
 *     result = await execFile(path, args, {
 *       cwd: folder,          ← run from the recipe folder
 *       encoding: "utf-8",    ← text output, not binary
 *       maxBuffer: 10 MB,     ← don't crash on huge recipes
 *       timeout: 15000,       ← 15 seconds max
 *     })
 *     RETURN result.stdout.trim()
 *   CATCH error:
 *     THROW "CookCLI error: " + error message
 */
export async function runCook(args: string[]): Promise<string> {
  const { recipePath } = getPreferences();
  try {
    const { stdout } = await execFileAsync(resolveCookPath(), args, {
      cwd: recipePath,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15000,
    });
    return stdout.trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`CookCLI error: ${msg}`);
  }
}

// ── FILESYSTEM RECIPE LISTING ──

export interface DirEntry {
  name: string; // filename (e.g. "pizza.cook")
  fullPath: string; // absolute path (e.g. "C:\...\Cook\pizza.cook")
  isDir: boolean; // is this a folder?
}

/**
 * List all .cook, .menu files and subdirectories in a folder.
 * Uses Node's fs module — NO CookCLI dependency for browsing.
 *
 * FUNCTION listRecipes(dir):
 *   result = []
 *   FOR EACH entry IN readdirSync(dir):
 *     fullPath = join(dir, entry.name)
 *
 *     TRY: isDir = statSync(fullPath).isDirectory()
 *     CATCH: skip this entry (broken symlink, permission issue, etc.)
 *
 *     IF it's a directory → add to result (so user can navigate into it)
 *     IF it ends with ".cook" or ".menu" → add to result
 *     ELSE → skip it (images, config files, etc.)
 *
 *   // Sort: folders first alphabetically, then files alphabetically
 *   RETURN result sorted by (isDir desc, name asc)
 */
export function listRecipes(dir: string): DirEntry[] {
  const items: DirEntry[] = [];
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(fp).isDirectory();
    } catch {
      continue;
    }
    if (isDir || name.endsWith(".cook") || name.endsWith(".menu"))
      items.push({ name, fullPath: fp, isDir });
  }
  return items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Turn a filename like "Neapolitan-Pizza.cook" into a friendly name "Neapolitan Pizza" */
export function friendlyName(name: string): string {
  return name.replace(/\.(cook|menu)$/i, "").replace(/[-_]/g, " ");
}

// ── COOKCLI JSON TYPES — exact shape of "cook recipe -f json" output ──

// The quantity type is deeply nested:
//   Regular:   { value: { type: "number", value: { type: "regular",  value: 6 } }, unit: "balls" }
//   Fraction:  { value: { type: "number", value: { type: "fraction", value: { whole, num, den, err } } }, unit: "tsp" }
type QuantityValue =
  | { type: "number"; value: { type: "regular"; value: number } }
  | {
      type: "number";
      value: {
        type: "fraction";
        value: { whole: number; num: number; den: number; err: number };
      };
    }
  | { type: string; value: unknown };

interface Quantity {
  value: QuantityValue;
  unit: string;
  scalable?: boolean;
}

interface Ingredient {
  name: string;
  quantity: Quantity | null;
  note: string | null;
  reference: { name: string; components: string[] } | null;
}

interface CookwareItem {
  name: string;
  quantity: Quantity | null;
  note: string | null;
}

/** One piece of a step — could be text, an ingredient reference, cookware, or a timer */
interface StepItem {
  type: "text" | "ingredient" | "cookware" | "timer" | "inline_quantity";
  value?: string;
  index?: number;
}

/** A single step in the recipe, like "Preheat the oven to 450°C" */
interface Step {
  items: StepItem[];
  number: number;
}

/** A section groups steps together (usually there's just one unnamed section) */
interface Section {
  name: string | null;
  content: { type: "step"; value: Step }[];
}

/** Metadata is a flat key-value map: { servings: 6, time: "30 min", tags: "italian", ... } */
interface Metadata {
  map: Record<string, unknown>;
}

/** The complete parsed recipe — this is what "cook recipe -f json" returns */
export interface RecipeData {
  metadata: Metadata;
  sections: Section[];
  ingredients: Ingredient[];
  cookware: CookwareItem[];
  timers: unknown[];
  inline_quantities: unknown[];
}

// ── QUANTITY FORMATTING ──

/**
 * Turn a CookCLI Quantity object into a display string.
 *
 * FUNCTION formatQuantity(qty):
 *   IF qty is null → return ""
 *
 *   valueStr = ""
 *   IF qty.value.type == "number":
 *     num = qty.value.value.value          ← the actual number
 *     IF num is a whole number AND has .0 → strip ".0" (show "6" not "6.0")
 *     valueStr = num as string
 *
 *   // Combine: "6" + " " + "balls" = "6 balls"
 *   IF valueStr exists AND unit exists → RETURN "valueStr unit"
 *   IF only valueStr → RETURN valueStr
 *   IF only unit → RETURN unit
 *   (if neither, returns "")
 */
export function formatQuantity(qty: Quantity | null): string {
  if (!qty) return "";
  let val = "";
  if (qty.value.type === "number") {
    const inner = qty.value.value as { type: string; value: unknown };
    if (inner.type === "regular") val = String(inner.value as number);
    else if (inner.type === "fraction") {
      const f = inner.value as { whole: number; num: number; den: number };
      val = `${f.num}/${f.den}`;
      if (f.whole > 0) val = `${f.whole} ${val}`;
    }
  }
  if (val.endsWith(".0")) val = val.slice(0, -2);
  return val && qty.unit ? `${val} ${qty.unit}` : val || qty.unit;
}

// ── FULL RECIPE → MARKDOWN (the main renderer) ──

/**
 * Convert parsed CookCLI recipe data into a pretty markdown string.
 * This is what gets displayed in the RecipeDetail and StaticRecipe views.
 *
 * FUNCTION recipeToMarkdown(data, filePath):
 *   meta = data.metadata.map
 *   name = meta.title OR filename without extension
 *
 *   md = "# " + name + "\n\n"
 *
 *   // STEP 1: Metadata pills row
 *   pills = []
 *   IF time → pills.push("⏱ " + time)
 *   IF servings → pills.push("👥 " + servings + " servings")
 *   IF tags → pills.push("🏷 " + tags)
 *   IF difficulty → pills.push("⚡ " + difficulty)
 *   IF cuisine → pills.push("🌍 " + cuisine)
 *   IF pills has items → md += pills joined with " | "
 *   IF source exists → md += "[Source](source)"
 *
 *   // STEP 2: Ingredients section
 *   md += "## 🥘 Ingredients\n\n"
 *   FOR EACH ingredient IN data.ingredients:
 *     qty = formatQuantity(ingredient.quantity)
 *     line = "- [ ] " + (qty ? "**qty** " : "") + ingredient.name
 *     IF ingredient has a reference to another recipe:
 *       line += " (→ path/to/recipe)"
 *     IF ingredient has a note:
 *       line += " — " + note
 *     md += line + "\n"
 *
 *   // STEP 3: Cookware section
 *   IF data.cookware not empty:
 *     md += "## 🔪 Cookware\n\n"
 *     FOR EACH item IN data.cookware:
 *       md += "- " + item.name + "\n"
 *
 *   // STEP 4: Steps section (flatten all sections)
 *   steps = flatten all sections → just the step objects
 *   IF steps not empty:
 *     md += "## 📋 Steps\n\n"
 *     FOR EACH step IN steps:
 *       md += step.number + ". "
 *       FOR EACH item IN step.items:
 *         SWITCH item.type:
 *           "text"        → md += item.value
 *           "ingredient"  → md += "**" + ingredient name + "**"
 *           "cookware"    → md += "*" + cookware name + "*"
 *           "timer"       → skip (timers show in cooking mode)
 *       md += "\n\n"
 *
 *   RETURN md
 */
export function recipeToMarkdown(data: RecipeData, filePath: string): string {
  const meta = data.metadata.map;
  const name = (meta.title as string) || friendlyName(basename(filePath));

  let md = `# ${name}\n\n`;

  // Metadata pills — compact quick-reference row
  const pills: string[] = [];
  if (meta.time) pills.push(`⏱ ${meta.time}`);
  if (meta.servings) pills.push(`👥 ${meta.servings} servings`);
  if (meta.tags) {
    const tagArr = Array.isArray(meta.tags)
      ? meta.tags
      : (meta.tags as string).split(",").map((s) => s.trim());
    pills.push(`🏷 ${tagArr.join(", ")}`);
  }
  if (meta.difficulty) pills.push(`⚡ ${meta.difficulty}`);
  if (meta.cuisine) pills.push(`🌍 ${meta.cuisine}`);
  if (pills.length) md += pills.join("  |  ") + "\n\n";
  if (meta.source) md += `*[Source](${meta.source})*\n\n`;

  // Title image — local file convention OR YAML metadata 'image' URL
  const titleImg = titleImgTag(filePath, meta.image as string | undefined);
  if (titleImg) {
    md += titleImg + "\n\n";
  }

  md += "---\n\n";

  // Ingredients with checkboxes and quantities
  if (data.ingredients.length) {
    md += "## 🥘 Ingredients\n\n";
    for (const ing of data.ingredients) {
      const qty = formatQuantity(ing.quantity);
      let line = `- [ ] ${qty ? `**${qty}** ` : ""}${ing.name}`;
      if (ing.reference)
        line += `  *(→ ${ing.reference.components.join("/")}/${ing.reference.name})*`;
      if (ing.note) line += ` — ${ing.note}`;
      md += line + "\n";
    }
    md += "\n";
  }

  // Cookware
  if (data.cookware.length) {
    md += "## 🔪 Cookware\n\n";
    for (const cw of data.cookware) {
      const qty = formatQuantity(cw.quantity);
      md += `- ${qty ? `**${qty}** ` : ""}${cw.name}\n`;
    }
    md += "\n";
  }

  // Steps — flatten all sections, resolve item references
  const steps = data.sections
    .flatMap((s) =>
      s.content.filter((c) => c.type === "step").map((c) => c.value),
    )
    .map((s, i) => ({ ...s, number: i + 1 })); // renumber sequentially across sections
  if (steps.length) {
    md += "## 📋 Steps\n\n";
    for (const step of steps) {
      md += `${step.number}. `;
      for (const item of step.items) {
        switch (item.type) {
          case "text":
            md += item.value || "";
            break;
          case "ingredient": {
            const ing = data.ingredients[item.index!];
            md += ing ? `**${ing.name}**` : `**[??]**`;
            break;
          }
          case "cookware": {
            const cw = data.cookware[item.index!];
            md += cw ? `*${cw.name}*` : `*[??]*`;
            break;
          }
          // Timer references in steps get skipped in full recipe view
          default:
            break;
        }
      }
      md += "\n\n";
    }
  }

  return md;
}

// ── IMAGE DISCOVERY ──
//
// Cooklang conventions (cooklang.org/docs/conventions/#adding-pictures):
//   Title image: RecipeName.{jpg,png} next to .cook file
//   Step images: RecipeName.1.jpg for step 1, RecipeName.3.jpg for step 3
//   URL alternative: metadata key "image" (HTTP URL)
//
// Raycast Detail renders <img> HTML tags but not ![alt](file://) markdown.
// For local files we use pathToFileURL() → file:/// URL. Rayzam does the same.

const IMG_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/** Convert local path → file:/// URL that Raycast <img> tags can render */
function localImgUrl(absPath: string): string {
  return pathToFileURL(absPath).href;
}

/** Return an <img> tag for a title image. Local files get file:/// URLs, HTTP URLs used directly. */
export function titleImgTag(
  recipePath: string,
  metadataImage?: string,
): string {
  // YAML metadata: image: https://...
  if (metadataImage && /^https?:\/\//.test(metadataImage)) {
    return `<img src="${metadataImage}" width="320" />`;
  }
  // Local file: RecipeName.jpg
  const base = recipePath.replace(/\.(cook|menu)$/i, "");
  for (const ext of IMG_EXTS) {
    const p = base + ext;
    if (existsSync(p)) return `<img src="${localImgUrl(p)}" width="320" />`;
  }
  return "";
}

/** Return an <img> tag for a step image. Convention: RecipeName.3.jpg = step 3 */
export function stepImgTag(recipePath: string, stepNumber: number): string {
  const base = recipePath.replace(/\.(cook|menu)$/i, "");
  for (const ext of IMG_EXTS) {
    const p = `${base}.${stepNumber}${ext}`;
    if (existsSync(p)) return `<img src="${localImgUrl(p)}" width="320" />`;
  }
  return "";
}
