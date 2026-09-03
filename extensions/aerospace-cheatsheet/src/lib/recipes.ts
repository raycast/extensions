import type { Binding } from "./config";
import { normalize } from "./dictionary";
import { keyDisplay } from "./keys";

/**
 * Goal-oriented walkthroughs: "I want this shape on screen, which keys get me there".
 *
 * Steps name a COMMAND, never a keystroke. The key is resolved against the user's own
 * config when the recipe is rendered, so these work on any keybindings — and when a
 * required command isn't bound at all, the step says so instead of showing a dead key
 * the user can't press.
 */

export interface RecipeStep {
  /** AeroSpace command whose key we resolve, or omitted for a "do this yourself" step. */
  command?: string;
  /** What the user does at this step. */
  instruction: string;
}

export interface Recipe {
  id: string;
  title: string;
  /** What you end up looking at. */
  outcome: string;
  /** Diagram basename in assets/diagrams. */
  diagram: string;
  /** Storyboard basename, if this recipe has a step-by-step strip. */
  storyboard?: string;
  steps: RecipeStep[];
  keywords: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: "left-strip-right-stack",
    title: "Left strip + right stack",
    outcome: "One full-height window down the left, the rest stacked in a column beside it.",
    diagram: "recipe-left-strip",
    storyboard: "recipe-left-strip-steps",
    steps: [
      { command: "layout --root h_tiles", instruction: "Make the workspace lay out in columns." },
      { instruction: "Focus the window you want at the top of the stack." },
      {
        command: "join-with right",
        instruction: "Join it with its right neighbor. The pair becomes a vertical stack in one column.",
      },
      {
        command: "move left",
        instruction: "From any window to the right of the stack, move left to push it in. Repeat to add more.",
      },
    ],
    keywords: ["sidebar", "strip", "stack", "master", "reference"],
  },
  {
    id: "2x2-grid",
    title: "2×2 grid",
    outcome: "Four windows in an even two-by-two grid.",
    diagram: "recipe-2x2",
    steps: [
      { command: "layout --root h_tiles", instruction: "With four windows open, lay the workspace out in columns." },
      {
        command: "join-with right",
        instruction: "Focus the first window and join right. Windows 1 and 2 become a stack.",
      },
      {
        command: "join-with right",
        instruction: "Focus the third window and join right. Windows 3 and 4 become the second stack.",
      },
    ],
    keywords: ["grid", "quad", "four", "2x2"],
  },
  {
    id: "three-columns",
    title: "Three columns",
    outcome: "Every window as an equal full-height column.",
    diagram: "recipe-three-columns",
    steps: [
      { command: "flatten-workspace-tree", instruction: "Flatten away any nesting from a previous layout." },
      { command: "layout --root h_tiles", instruction: "Set the root axis to columns." },
    ],
    keywords: ["columns", "equal", "side by side"],
  },
  {
    id: "reset",
    title: "Reset and start over",
    outcome: "A clean, evenly-split workspace with no containers left behind.",
    diagram: "recipe-reset",
    steps: [
      { command: "flatten-workspace-tree", instruction: "Collapse every container." },
      { command: "balance-sizes", instruction: "Even out the splits." },
    ],
    keywords: ["reset", "undo", "clean", "start over"],
  },
];

export interface ResolvedStep extends RecipeStep {
  /** Display key, or undefined when the command isn't bound in this config. */
  keys?: string;
  /** True when the recipe needs a command this user hasn't bound. */
  unbound: boolean;
}

export interface ResolvedRecipe extends Recipe {
  resolved: ResolvedStep[];
  /** Commands the recipe needs but this config doesn't bind. */
  missing: string[];
}

/**
 * Bind a recipe to a config. Prefers a main-mode binding — a command reachable only
 * inside a service mode is technically bound but is a worse instruction to give.
 */
export function resolveRecipe(recipe: Recipe, bindings: Binding[]): ResolvedRecipe {
  const byCommand = new Map<string, Binding[]>();
  for (const binding of bindings) {
    for (const command of binding.commands) {
      const key = normalize(command);
      const existing = byCommand.get(key);
      if (existing) existing.push(binding);
      else byCommand.set(key, [binding]);
    }
  }

  const missing: string[] = [];
  const resolved = recipe.steps.map((step): ResolvedStep => {
    if (!step.command) return { ...step, unbound: false };
    const candidates = byCommand.get(normalize(step.command));
    if (!candidates || candidates.length === 0) {
      missing.push(step.command);
      return { ...step, unbound: true };
    }
    // Prefer a main-mode binding, and within that the arrow spelling — the same
    // ordering the list rows use, so a recipe never teaches a different key than the
    // one shown next to the command it names.
    const main = candidates.filter((b) => b.mode === "main");
    const pool = main.length > 0 ? main : candidates;
    const preferred = pool.find((b) => /-(left|down|up|right)$/.test(b.key)) ?? pool[0];
    return { ...step, keys: keyDisplay(preferred.key), unbound: false };
  });

  // A recipe can use the same command in two steps; report it once.
  return { ...recipe, resolved, missing: [...new Set(missing)] };
}
