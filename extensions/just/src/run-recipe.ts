import { showHUD, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import {
  getUserShell,
  loadRecipes,
  loadRecipesFromFolders,
  matchRecipes,
  buildRecipeCmd,
  isPathLikeFolder,
  expandPath,
  ensureJustInstalled,
} from "./just-utils";

export default async function Command(props: {
  arguments: Arguments.RunRecipe;
}) {
  const { folder: folderArgument, recipe: recipeArgument } = props.arguments;

  if (!folderArgument || !recipeArgument) {
    await showHUD("Provide folder and recipe arguments");
    return;
  }

  try {
    ensureJustInstalled();
  } catch (e) {
    await showHUD(e instanceof Error ? e.message : String(e));
    return;
  }

  const { justfileFolders = "" } = getPreferenceValues<Preferences>();
  const parseErrors: string[] = [];
  const onError = (jf: string, e: unknown) =>
    parseErrors.push(`${path.basename(path.dirname(jf))}: ${String(e)}`);
  const recipes = isPathLikeFolder(folderArgument)
    ? loadRecipesFromFolders([expandPath(folderArgument)], onError)
    : await loadRecipes(justfileFolders, onError);
  const matches = matchRecipes(
    recipes,
    isPathLikeFolder(folderArgument) ? "" : folderArgument,
    recipeArgument,
  );

  if (matches.length === 0) {
    const detail = parseErrors.length
      ? ` (parse error: ${parseErrors[0]})`
      : "";
    await showHUD(
      `No recipe found: ${folderArgument} ${recipeArgument}${detail}`,
    );
    return;
  }
  if (matches.length > 1) {
    await showHUD(`Ambiguous: ${matches.length} recipes match`);
    return;
  }

  const recipe = matches[0];

  if (
    recipe.params.some(
      (p) =>
        (p.kind === "singular" || p.kind === "plus") && p.defaultValue === null,
    )
  ) {
    await showHUD(`${recipe.name} requires parameters — use Browse Justfiles`);
    return;
  }

  const cmd = buildRecipeCmd(recipe, []);

  await new Promise<void>((resolve) => {
    execFile(
      getUserShell(),
      ["-l", "-i", "-c", cmd],
      {},
      async (error, stdout) => {
        const output = error ? error.message : stdout;
        const lastLine =
          output.trim().split("\n").filter(Boolean).pop() ?? `${recipe.name} ✓`;
        await showHUD(lastLine);
        resolve();
      },
    );
  });
}
