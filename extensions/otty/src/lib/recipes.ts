/** One entry of `otty recipe list --json` (Otty 1.6.5+), most recently updated first. */
export type Recipe = {
  id: string;
  name: string;
  /** `tab`, `window` or `commands`; Otty's docs also describe snippets. */
  scope: string;
  /** `layout`, `scrollback` or `commands`. */
  content: string;
  includes_commands: boolean;
  command_count: number;
  tab_count: number;
  alias: string | null;
  shortcut: string | null;
  /** ISO 8601. */
  updated_at: string;
};

export function parseRecipeList(data: unknown): Recipe[] {
  const valid =
    Array.isArray(data) && data.every((entry) => typeof entry?.id === "string" && typeof entry.name === "string");
  if (!valid) throw new Error("Unexpected recipe list from Otty CLI");
  return data as Recipe[];
}

const SCOPE_LABELS: Record<string, string> = { tab: "Tab", window: "Window", commands: "Commands", snippet: "Snippet" };
const CONTENT_LABELS: Record<string, string> = { layout: "Layout", scrollback: "Layout and scrollback" };

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** "Tab · Layout", "Window · 2 tabs · Layout · 3 commands", "Commands · 1 command". */
export function recipeSubtitle(recipe: Recipe): string {
  const parts = [SCOPE_LABELS[recipe.scope] ?? recipe.scope];
  if (recipe.scope === "commands") {
    parts.push(count(recipe.command_count, "command"));
    return parts.join(" · ");
  }
  if (recipe.scope === "window") parts.push(count(recipe.tab_count, "tab"));
  const content = CONTENT_LABELS[recipe.content];
  if (content) parts.push(content);
  if (recipe.includes_commands && recipe.command_count > 0) parts.push(count(recipe.command_count, "command"));
  return parts.join(" · ");
}

/** Only recipes that build tabs can open in a new window or tab; a commands recipe replays into the focused pane. */
export function isLayoutRecipe(recipe: Recipe): boolean {
  return recipe.scope === "tab" || recipe.scope === "window";
}

const LEFT_PANE = "5B6C1F7E-2A4D-4E8B-9C3A-1D2E3F4A5B6C";
const RIGHT_PANE = "8E9F0A1B-3C4D-4F5E-8A6B-7C8D9E0F1A2B";

/**
 * One tab split left and right, in the format Otty writes when it exports a
 * recipe (`pane_tree` plus pane ids; the docs' `split`/`size` keys are ignored).
 * No commands: Otty asks to trust a file that runs them, and its save panel
 * skips commands that came from a recipe.
 */
export const STARTER_RECIPE = `# Starter recipe from the Otty Raycast extension. Rearrange it, then press ⌘S in Otty to save your own.

[recipe]
name = "Two Panes"
version = 1
scope = "tab"
content = "layout"

[[window.tabs]]
title = ""
title_mode = "auto"
focused_pane = "${LEFT_PANE}"
pane_tree = ${JSON.stringify(JSON.stringify({ axis: 1, ratio: 0.5, first: { leaf: LEFT_PANE }, second: { leaf: RIGHT_PANE } }))}

[[window.tabs.panes]]
id = "${LEFT_PANE}"
cwd = "{{current_folder}}"

[[window.tabs.panes]]
id = "${RIGHT_PANE}"
cwd = "{{current_folder}}"
`;
