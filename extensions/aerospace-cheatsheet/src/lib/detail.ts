import { environment } from "@raycast/api";
import SIZES from "./diagram-sizes.json";
import type { Row } from "./rows";
import type { ResolvedRecipe } from "./recipes";

/**
 * Builds the markdown for the detail pane.
 *
 * Split of responsibilities, applied consistently:
 *   markdown  — anything SPATIAL or SEQUENTIAL (a diagram, a numbered walkthrough)
 *   metadata  — LOOKUP FACTS (keys, raw command, mode, what undoes it)
 *
 * Keys are always rendered from the live config, never from the diagram, because the
 * diagrams are shared assets that have to stay true on anybody's keybindings.
 */

// A JSON import widens its arrays to number[], so this is the type the data actually
// has. The generator always writes a width/height pair; the lookup below tolerates
// anything else by falling back to an unsized image rather than asserting a tuple.
const sizes: Record<string, number[]> = SIZES;

/**
 * Picks the theme variant explicitly, rather than relying on the `@dark` filename.
 *
 * Raycast applies that convention to icons but NOT to images inside markdown, so the
 * light asset was being served on a dark UI: its fills are black at 7% opacity, which
 * on Raycast's rgb(58,58,59) detail pane rendered as near-invisible dark boxes.
 * Measured from a real capture — the fill read rgb(54,54,54), exactly black-at-0.07
 * over that ground, which is how the light variant was identified as the culprit.
 *
 * Width and height are pinned to the SVG's intrinsic size so the pane never stretches
 * it.
 */
export function diagramMarkdown(name: string | undefined, alt = ""): string {
  if (!name) return "";
  const size = sizes[name];
  const query = size?.length === 2 ? `?raycast-width=${size[0]}&raycast-height=${size[1]}` : "";
  const variant = isDark() ? `${name}@dark` : name;
  return `![${alt}](diagrams/${variant}.svg${query})`;
}

/** Falls back to dark, which is what the large majority of Raycast users run. */
function isDark(): boolean {
  try {
    return environment.appearance !== "light";
  } catch {
    return true;
  }
}

function keyLine(row: Row): string {
  const primary = row.keys.filter((k) => !k.alternate).map((k) => `\`${k.display}\``);
  const alternates = row.keys.filter((k) => k.alternate).map((k) => `\`${k.display}\``);
  const parts = [primary.join(" · ")];
  if (alternates.length > 0) parts.push(`or ${alternates.join(" · ")}`);
  return parts.join("  ");
}

export function rowMarkdown(row: Row): string {
  const out: string[] = [`## ${row.title}`, "", keyLine(row), ""];

  const diagram = diagramMarkdown(row.diagram, row.title);
  if (diagram) out.push(diagram, "");

  if (row.blurb) out.push(row.blurb, "");
  if (row.teaches) out.push(row.teaches, "");

  if (!row.entry) {
    out.push(
      "This binding isn't in the cheatsheet's dictionary yet, so it's shown exactly as written in your config.",
      "",
    );
  }
  return out.join("\n");
}

export function recipeMarkdown(recipe: ResolvedRecipe, { storyboard = false } = {}): string {
  const out: string[] = [`## ${recipe.title}`, ""];

  const image = storyboard && recipe.storyboard ? recipe.storyboard : recipe.diagram;
  const diagram = diagramMarkdown(image, recipe.title);
  if (diagram) out.push(diagram, "");

  out.push(recipe.outcome, "");

  if (recipe.missing.length > 0) {
    out.push(
      `> **Not fully available on your config.** This recipe needs ${recipe.missing
        .map((c) => `\`${c}\``)
        .join(" and ")}, which you haven't bound to a key. Add a binding to run it as written.`,
      "",
    );
  }

  recipe.resolved.forEach((step, index) => {
    const key = step.unbound ? "_not bound_" : step.keys ? `\`${step.keys}\`` : "";
    out.push(`${index + 1}. ${key}${key ? ": " : ""}${step.instruction}`);
  });

  return out.join("\n");
}
