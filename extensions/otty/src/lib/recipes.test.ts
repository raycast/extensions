import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLayoutRecipe, parseRecipeList, recipeSubtitle, STARTER_RECIPE, type Recipe } from "./recipes";

// Captured from `otty recipe list --json` (Otty 1.6.5).
const recipes = parseRecipeList(JSON.parse(readFileSync(join(__dirname, "fixtures/recipe-list.json"), "utf8")).data);
const byId = (prefix: string): Recipe => {
  const found = recipes.find((recipe) => recipe.id.startsWith(prefix));
  if (!found) throw new Error(`No recipe ${prefix}`);
  return found;
};

describe("parseRecipeList", () => {
  it("keeps Otty's order, most recently updated first", () => {
    expect(recipes.map((recipe) => recipe.id.slice(0, 4))).toEqual(["E3A0", "C88B", "AA01", "1D3A"]);
  });

  it("rejects output that isn't a recipe list", () => {
    expect(() => parseRecipeList({})).toThrow("Unexpected recipe list");
    expect(() => parseRecipeList([{ name: "no id" }])).toThrow("Unexpected recipe list");
  });
});

describe("recipeSubtitle", () => {
  it("names the scope and what the recipe saved", () => {
    expect(recipeSubtitle(byId("E3A0"))).toBe("Tab · Layout and scrollback");
    expect(recipeSubtitle(byId("AA01"))).toBe("Tab · Layout");
    expect(recipeSubtitle(byId("C88B"))).toBe("Commands · 1 command");
    expect(recipeSubtitle(byId("1D3A"))).toBe("Window · 1 tab · Layout");
  });

  it("counts saved commands alongside a layout", () => {
    expect(recipeSubtitle({ ...byId("AA01"), includes_commands: true, command_count: 3 })).toBe(
      "Tab · Layout · 3 commands",
    );
  });
});

describe("isLayoutRecipe", () => {
  it("offers a new window or tab only for recipes that build tabs", () => {
    expect(isLayoutRecipe(byId("AA01"))).toBe(true);
    expect(isLayoutRecipe(byId("1D3A"))).toBe(true);
    expect(isLayoutRecipe(byId("C88B"))).toBe(false);
  });
});

describe("STARTER_RECIPE", () => {
  // A real recipe Otty wrote for a tab split in two.
  const exported = readFileSync(join(__dirname, "fixtures/two-pane-tab.ottyrecipe"), "utf8");
  const tableKeys = (toml: string) => [...toml.matchAll(/^(\[\[?[^\]]+\]\]?|[a-z_]+) ?=?/gm)].map((m) => m[1]);

  it("uses the same tables and keys as a recipe Otty exported", () => {
    const strip = (keys: string[]) => keys.filter((key) => key !== "commands");
    expect(strip(tableKeys(STARTER_RECIPE))).toEqual(strip(tableKeys(exported)));
  });

  it("splits one tab into two panes that both exist", () => {
    const tree = JSON.parse(JSON.parse(STARTER_RECIPE.match(/^pane_tree = (".*")$/m)![1]));
    const ids = [...STARTER_RECIPE.matchAll(/^id = "([^"]+)"$/gm)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect([tree.first.leaf, tree.second.leaf]).toEqual(ids);
    expect(tree.axis).toBe(1);
    expect(STARTER_RECIPE).toContain(`focused_pane = "${ids[0]}"`);
  });

  it("runs no commands, so Otty asks no trust question", () => {
    expect(STARTER_RECIPE).not.toMatch(/^commands/m);
  });
});
