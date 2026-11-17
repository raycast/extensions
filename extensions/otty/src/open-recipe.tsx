import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { OttyTooOldError, runOtty, runOttyJson } from "./lib/otty";
import { buildOpenWindowArgs, buildRecipeApplyArgs, buildRecipeListArgs } from "./lib/otty-core";
import { isLayoutRecipe, parseRecipeList, recipeSubtitle, STARTER_RECIPE, type Recipe } from "./lib/recipes";
import { LoadFailureView, openAndClose, RefreshAction, useRefreshFailureToast } from "./lib/ui";

const RECIPES_DOCS_URL = "https://docs.otty.sh/workflows/recipes";

const SCOPE_ICONS: Record<string, Icon> = {
  tab: Icon.AppWindowSidebarLeft,
  window: Icon.AppWindow,
  commands: Icon.Terminal,
};

async function loadRecipes(): Promise<Recipe[]> {
  return parseRecipeList(await runOttyJson<unknown>(buildRecipeListArgs()));
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadRecipes, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  // An old Otty gets the full Update Otty view below, not a toast over rows that are no longer shown.
  useRefreshFailureToast(error, Boolean(data) && !(error instanceof OttyTooOldError), "Could not refresh Otty recipes");

  // Cached rows would hide why nothing refreshes: an old Otty always gets the Update Otty view.
  if (error && (!data || error instanceof OttyTooOldError)) {
    return (
      <List>
        <LoadFailureView title="Could Not Read Otty Recipes" error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recipes">
      <List.EmptyView
        icon={Icon.Document}
        title="No Saved Recipes"
        description="In Otty, arrange your tabs and press ⌘S to save a recipe. Or open a starter: one tab split in two."
        actions={
          <ActionPanel>
            <OpenStarterAction />
            <Action.OpenInBrowser title="Open Recipes Guide" url={RECIPES_DOCS_URL} />
          </ActionPanel>
        }
      />
      {(data ?? []).map((recipe) => (
        <RecipeItem key={recipe.id} recipe={recipe} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function RecipeItem({ recipe, onRefresh }: { recipe: Recipe; onRefresh: () => void }) {
  const failure = `Could not open ${recipe.name}`;
  // A commands recipe replays into Otty's focused pane rather than building tabs.
  const layout = isLayoutRecipe(recipe);
  const updated = new Date(recipe.updated_at);
  return (
    <List.Item
      icon={SCOPE_ICONS[recipe.scope] ?? Icon.Document}
      title={recipe.name}
      subtitle={recipeSubtitle(recipe)}
      keywords={[recipe.scope, ...(recipe.alias ? [recipe.alias] : [])]}
      accessories={Number.isNaN(updated.getTime()) ? undefined : [{ date: updated, tooltip: "Last saved" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={layout ? "Open Recipe" : "Run in Focused Pane"}
              icon={layout ? Icon.Play : Icon.Terminal}
              onAction={() => openAndClose(failure, () => runOtty(buildRecipeApplyArgs(recipe.id)))}
            />
            {layout ? (
              <>
                <Action
                  title="Open in New Window"
                  icon={Icon.AppWindow}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={() =>
                    openAndClose(failure, () => runOtty(buildRecipeApplyArgs(recipe.id, { newWindow: true })))
                  }
                />
                <Action
                  title="Open in New Tab"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() =>
                    openAndClose(failure, () => runOtty(buildRecipeApplyArgs(recipe.id, { newTab: true })))
                  }
                />
              </>
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Recipe ID"
              content={recipe.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.OpenInBrowser title="Open Recipes Guide" url={RECIPES_DOCS_URL} />
            <RefreshAction onRefresh={onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Written to the extension's own folder: Otty doesn't list files placed in its recipes folder. */
function OpenStarterAction() {
  return (
    <Action
      title="Open Starter Recipe"
      icon={Icon.Wand}
      onAction={() =>
        openAndClose("Could not open the starter recipe", async () => {
          await mkdir(environment.supportPath, { recursive: true });
          const path = join(environment.supportPath, "starter.ottyrecipe");
          await writeFile(path, STARTER_RECIPE);
          await runOtty(buildOpenWindowArgs(path));
        })
      }
    />
  );
}
