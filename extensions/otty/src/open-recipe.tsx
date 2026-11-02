import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { findFiles } from "./lib/paths";
import { runAndClose } from "./lib/ui";
import { abbreviateHome, basename, expandHome } from "./lib/workspace";

const OTTY_BUNDLE_ID = "io.appmakes.otty";
const RECIPE_EXTENSION = ".ottyrecipe";
const RECIPES_DOCS_URL = "https://docs.otty.sh/workflows/recipes";

export default function Command() {
  const { recipesDirectory } = getPreferenceValues<Preferences.OpenRecipe>();
  const home = homedir();
  const root = expandHome(recipesDirectory, home);
  const { data, isLoading } = useCachedPromise(findFiles, [root ?? "", RECIPE_EXTENSION, 3], {
    keepPreviousData: true,
    execute: Boolean(root),
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recipes">
      {root ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Recipes Found"
          description="Export a recipe from Otty with ⇧⌘S and save it in this folder."
          actions={
            <ActionPanel>
              <SetupActions />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="Choose a Recipes Folder"
          description="Pick the folder that holds your exported recipes in preferences."
          actions={
            <ActionPanel>
              <SetupActions />
            </ActionPanel>
          }
        />
      )}
      {(data ?? []).map((path) => (
        <List.Item
          key={path}
          icon={Icon.Document}
          title={basename(path).slice(0, -RECIPE_EXTENSION.length)}
          subtitle={abbreviateHome(dirname(path), home)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Open Recipe"
                  icon={Icon.Play}
                  onAction={() => runAndClose(`Could not open ${basename(path)}`, () => open(path, OTTY_BUNDLE_ID))}
                />
                <Action.ShowInFinder path={path} />
                <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <SetupActions />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SetupActions() {
  return (
    <>
      <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      <Action.OpenInBrowser title="Open Recipes Guide" url={RECIPES_DOCS_URL} />
    </>
  );
}
