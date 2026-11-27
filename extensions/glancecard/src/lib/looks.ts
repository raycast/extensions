// glancecard's looks, grouped as the Grid shows them. The names come from glancecard itself
// (site/editor.js mirrors src/theme.js, held to it by glancecard's tests), so a look added
// there appears here, under "Other" until it is given a group.
import { LIGHT, LIGHT_LOOKS, LOOKS, SEASONS, TUBES, lightOf } from "glancecard/setup";

const PRINTOUTS = LOOKS.filter((l) => l.startsWith("printout-"));
const seasonOf = (look: string) => look.replace(/-light$/, "");
const isSeasonal = (look: string) => seasonOf(look) in SEASONS;

export const isLight = (look: string) => LIGHT_LOOKS.includes(look);

/** The Grid's sections, in the order a reader meets them. */
export function lookGroups(): { title: string; looks: string[] }[] {
  const placed = new Set<string>();
  const take = (title: string, test: (look: string) => boolean) => {
    const looks = LOOKS.filter((l) => !placed.has(l) && test(l));
    looks.forEach((l) => placed.add(l));
    return { title, looks };
  };
  // Taken most particular first, shown in reading order.
  const seasonal = take("Seasonal", isSeasonal);
  const terminal = take("Terminal", (l) => TUBES.includes(l) || PRINTOUTS.includes(l));
  const workbench = take("Workbench", (l) => l === "workbench");
  const dark = take("Dark", (l) => !isLight(l));
  const light = take("Light", isLight);
  const other = take("Other", () => true);
  return [dark, light, terminal, workbench, seasonal, other].filter((g) => g.looks.length);
}

/** "upside-down-light" → "Upside Down Light". */
export const lookTitle = (look: string) =>
  look
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/** When a seasonal look is worn on the Action's cards, or null for a look worn all year. */
export const seasonNote = (look: string): string | null =>
  isSeasonal(look) ? `Worn ${SEASONS[seasonOf(look)]}` : null;

/** A dark look's light side, a light side's dark look; null for a look that reads the same on both. */
export function otherSide(look: string): string | null {
  if (!isLight(look)) {
    const light = lightOf(look);
    return light === look ? null : light;
  }
  return LOOKS.find((l) => !isLight(l) && l !== look && lightOf(l) === look) ?? null;
}

/**
 * The setup a card's look asks for: a look with a light side follows the reader's theme with
 * the pair, a look that reads the same on both is one file, a light look without a dark one
 * (a Printout paper) is worn on both themes.
 */
export function choiceFor(look: string): {
  mode: "follow" | "one";
  dark: string;
  light: "own" | "daylight";
  look: string;
} {
  if (!isLight(look)) return { mode: "follow", dark: look, light: "own", look };
  const dark = otherSide(look);
  if (dark) return { mode: "follow", dark, light: look === LIGHT && dark !== "midnight" ? "daylight" : "own", look };
  return { mode: "one", dark: "midnight", light: "own", look };
}

export const defaultLook = (appearance: string) => (appearance === "light" ? LIGHT : "midnight");

export { LOOKS };
